package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Session struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Team      string             `bson:"team" json:"team"`
	StartTime int64              `bson:"startTime" json:"startTime"` // Unix milli
	EndTime   int64              `bson:"endTime,omitempty" json:"endTime"`
	Status    string             `bson:"status" json:"status"` // "running", "finished"
}

type Event struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Type      string             `bson:"type" json:"type"` // "START", "STOP"
	Team      string             `bson:"team" json:"team"`
	Time      int64              `bson:"time" json:"time"`
	Source    string             `bson:"source" json:"source"`
}
