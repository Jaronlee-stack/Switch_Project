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