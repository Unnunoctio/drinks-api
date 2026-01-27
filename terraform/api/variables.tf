variable "cloudflare_api_token" {
    description = "Cloudflare API token"
    type        = string
    sensitive   = true
}

variable "cloudflare_account_id" {
    description = "Cloudflare account ID"
    type        = string
}

variable "project_name" {
    description = "Name of the Cloudflare project"
    type        = string
    default     = "drinks-api"
}

variable "admin_api_key" {
    description = "API Key for endpoints that require authentication"
    type        = string
    sensitive   = true
}

variable "rate_limit_requests" {
    description = "Maximum number of requests per range"
    type        = number
    default     = 15
}

variable "rate_limit_period" {
    description = "Time period for rate limiting"
    type        = number
    default     = 60
}

