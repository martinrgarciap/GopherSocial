package env

import (
	"os"
	"strconv"
	"time"
)

func GetString(key string, fallback string) string {
	val, ok := os.LookupEnv(key)

	if !ok {
		return fallback
	}

	return val
}

func GetInt(key string, fallback int) int {
	val, ok := os.LookupEnv(key)

	if !ok {
		return fallback
	}

	valAsInt, err := strconv.Atoi(val)

	if err != nil {
		return fallback
	}

	return valAsInt
}

func GetDuration(key string, fallback time.Duration) time.Duration {
	duration, err := time.ParseDuration(key)

	if err != nil {
		return fallback
	}

	return duration
}
