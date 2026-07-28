"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.averageFrames = averageFrames;
function averageFrames(frames) {
    if (frames.length === 0) {
        return {
            neck_angle: 90,
            back_angle: 90,
            head_forward_distance: 0,
        };
    }
    const sum = frames.reduce((acc, frame) => ({
        neck_angle: acc.neck_angle + frame.neck_angle,
        back_angle: acc.back_angle + frame.back_angle,
        head_forward_distance: acc.head_forward_distance + frame.head_forward_distance,
    }), { neck_angle: 0, back_angle: 0, head_forward_distance: 0 });
    return {
        neck_angle: Math.round((sum.neck_angle / frames.length) * 100) / 100,
        back_angle: Math.round((sum.back_angle / frames.length) * 100) / 100,
        head_forward_distance: Math.round((sum.head_forward_distance / frames.length) * 100) / 100,
    };
}
//# sourceMappingURL=frameAverager.js.map