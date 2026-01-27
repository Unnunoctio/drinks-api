terraform {
    required_providers {
        cloudflare = {
            source  = "cloudflare/cloudflare"
            version = "5.16.0"
        }
    }
}

provider "cloudflare" {
    api_token = var.cloudflare_api_token
}

resource "cloudflare_d1_database" "drinks_db" {
    account_id = var.cloudflare_account_id
    name       = "${var.project_name}-db"

    read_replication = {
        mode = "disabled"
    }
}

resource "cloudflare_worker" "drinks_api" {
    account_id = var.cloudflare_account_id
    name       = "${var.project_name}"

    subdomain  = {
        enabled = true
        previews_enabled = false
    }

    observability   = {
        enabled = true
        head_sampling_rate = 0.05
        logs = {
            enabled = true
            head_sampling_rate = 0.05
            invocation_logs = true
        }
    }
}

resource "cloudflare_worker_version" "drinks_api_production" {
    account_id = var.cloudflare_account_id
    worker_id  = cloudflare_worker.drinks_api.id
    compatibility_date = "2026-01-26"
    main_module = "index.js"

    modules = [
        {
            content_file = "${path.module}/../../api/dist/index.js"
            content_type = "application/javascript+module"
            name         = "index.js"
        }
    ]

    bindings = [
        {
            type = "secret_text",
            name = "ADMIN_API_KEY",
            text = var.admin_api_key
        },
        {
            type = "d1",
            name = "DB",
            id   = cloudflare_d1_database.drinks_db.id
        },
    ]
}

resource "cloudflare_workers_deployment" "drinks_api_deployment" {
    account_id = var.cloudflare_account_id
    script_name = cloudflare_worker.drinks_api.name
    strategy = "percentage"

    versions = [
        {
            percentage = 100
            version_id = cloudflare_worker_version.drinks_api_production.id
        }
    ]

    annotations = {
        workers_message = "Deployed by Terraform"
    }
}

resource "local_file" "wrangler_config" {
    filename = "${path.module}/../../api/wrangler.toml"
    content  = templatefile("${path.module}/wrangler.toml.tpl", {
        project_name  = var.project_name
        account_id    = var.cloudflare_account_id
        d1_database_name = cloudflare_d1_database.drinks_db.name
        d1_database_id = cloudflare_d1_database.drinks_db.id
        rate_limit_requests = var.rate_limit_requests
        rate_limit_period = var.rate_limit_period
        observability_enabled = cloudflare_worker.drinks_api.observability.enabled
        observability_head_sampling_rate = cloudflare_worker.drinks_api.observability.head_sampling_rate
        observability_logs_enabled = cloudflare_worker.drinks_api.observability.logs.enabled
        observability_logs_head_sampling_rate = cloudflare_worker.drinks_api.observability.logs.head_sampling_rate
        observability_logs_invocation_logs = cloudflare_worker.drinks_api.observability.logs.invocation_logs
    })
}

output "worker_url" {
    description = "URL of the Cloudflare Worker"
    value       = "https://${var.project_name}.${var.cloudflare_account_id}.workers.dev"
}

output "d1_database_name" {
    description = "Name of the D1 database"
    value       = cloudflare_d1_database.drinks_db.name
}

