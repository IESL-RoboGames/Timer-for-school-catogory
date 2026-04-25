package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Session struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Team            string             `bson:"team" json:"team"`
	Round           int                `bson:"round" json:"round"`        // 1, 2, or 3
	StartTime       int64              `bson:"startTime" json:"startTime"` // Unix milli
	EndTime         int64              `bson:"endTime,omitempty" json:"endTime"`
	Status          string             `bson:"status" json:"status"` // "running", "finished", "cancelled", "hidden"
	ChargeStartTime int64              `bson:"chargeStartTime,omitempty" json:"chargeStartTime,omitempty"`
	ChargeEndTime   int64              `bson:"chargeEndTime,omitempty" json:"chargeEndTime,omitempty"`
	ChargeStatus    string             `bson:"chargeStatus,omitempty" json:"chargeStatus,omitempty"` // "running", "finished"
}

type Event struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Type       string             `bson:"type" json:"type"` // "START", "STOP", "RESET", "RESUME", etc.
	Team       string             `bson:"team" json:"team"`
	Round      int                `bson:"round,omitempty" json:"round,omitempty"`
	Time       int64              `bson:"time" json:"time"`
	Source     string             `bson:"source,omitempty" json:"source,omitempty"`
	RequestID  string             `bson:"requestId,omitempty" json:"requestId,omitempty"`
	RecordedAt int64              `bson:"recordedAt,omitempty" json:"recordedAt,omitempty"`
}
