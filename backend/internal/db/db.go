package db

import (
	"context"
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"

	"posture-backend/internal/models"
)

type Client struct {
	db *sql.DB
}

func New(host string, port int, user, password, dbname string) (*Client, error) {
	connStr := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		host,
		port,
		user,
		password,
		dbname,
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return &Client{db: db}, nil
}

func (c *Client) Close() error {
	return c.db.Close()
}

func (c *Client) GetSOPRules(ctx context.Context) ([]models.SOPRule, error) {
	rows, err := c.db.QueryContext(ctx, `
		SELECT
			rule_name,
			min_angle,
			max_angle,
			result,
			recommendation,
			robot_action
		FROM rules_table
		ORDER BY rule_id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []models.SOPRule

	for rows.Next() {
		var r models.SOPRule

		err := rows.Scan(
			&r.RuleName,
			&r.MinAngle,
			&r.MaxAngle,
			&r.Result,
			&r.Recommendation,
			&r.RobotAction,
		)

		if err != nil {
			return nil, err
		}

		rules = append(rules, r)
	}

	return rules, rows.Err()
}

func (c *Client) GetLatestFrames(ctx context.Context, limit int) ([]models.PostureFrame, error) {

	rows, err := c.db.QueryContext(ctx, `
		SELECT
			neck_angle,
			back_angle,
			head_forward_distance
		FROM posture_detections
		ORDER BY detected_at DESC
		LIMIT $1
	`, limit)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	var frames []models.PostureFrame

	for rows.Next() {

		var f models.PostureFrame

		err := rows.Scan(
			&f.NeckAngle,
			&f.BackAngle,
			&f.HeadForwardDistance,
		)

		if err != nil {
			return nil, err
		}

		frames = append(frames, f)
	}

	return frames, rows.Err()
}

func (c *Client) UpdateLatestAdvice(ctx context.Context, advice string, confidence float64) error {

	_, err := c.db.ExecContext(ctx, `
		UPDATE posture_detections
		SET
			advice = $1,
			confidence_score = $2
		WHERE detection_id = (
			SELECT detection_id
			FROM posture_detections
			ORDER BY detected_at DESC
			LIMIT 1
		)
	`, advice, confidence)

	return err
}
func (c *Client) InsertDetection(ctx context.Context, userID string, frame models.PostureFrame) error {
	_, err := c.db.ExecContext(ctx, `
		INSERT INTO posture_detections
		(user_id,
		neck_angle,
		back_angle,
		head_forward_distance,
		posture_result,
		detected_at)
		VALUES ($1,$2,$3,$4,$5,$6)
	`,
		userID,
		frame.NeckAngle,
		frame.BackAngle,
		frame.HeadForwardDistance,
		frame.PostureResult,
		frame.DetectedAt,
	)

	return err
}

func (c *Client) GetLatestAdvice(ctx context.Context) (models.PostureAdvice, error) {

	var advice models.PostureAdvice

	err := c.DB.QueryRowContext(ctx, `
		SELECT
			advice,
			COALESCE(confidence_score,0)
		FROM posture_detections
		ORDER BY detected_at DESC
		LIMIT 1
	`).Scan(
		&advice.Advice,
		&advice.ConfidenceScore,
	)

	return advice, err
}