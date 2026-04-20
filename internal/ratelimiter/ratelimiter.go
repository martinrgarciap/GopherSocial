package ratelimiter

import (
	"context"
	"time"

	"github.com/go-redis/redis/v8"
)

type FixedWindowLimiter interface {
	FixedWindowAllow(ip string) (bool, time.Duration)
	FixedWindowCachedAllow(ctx context.Context, rdb *redis.Client, ip string) (bool, time.Duration, error)
}

type TokenBucketLimiter interface {
	TokenBucketAllow(ip string) (bool, time.Duration)
}

type Config struct {
	RequestsPerTimeFrame int
	TimeFrame            time.Duration
	Enabled              bool
}
