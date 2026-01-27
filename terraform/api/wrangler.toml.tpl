name = "${project_name}"
main = "src/index.ts"
compatibility_date = "2026-01-26"

[[ratelimits]]
name = "RATE_LIMITER"
namespace_id = "1001"
simple = { limit = ${rate_limit_requests}, period = ${rate_limit_period} }

[[d1_databases]]
binding = "DB"
database_name = "${d1_database_name}"
database_id = "${d1_database_id}"

[observability]
enabled = ${observability_enabled}
head_sampling_rate = ${observability_head_sampling_rate}

[observability.logs]
enabled = ${observability_logs_enabled}
head_sampling_rate = ${observability_logs_head_sampling_rate}
invocation_logs = ${observability_logs_invocation_logs}
