provider "google" {
  project = var.project_id
  region  = var.region
}

# 1. Artifact Registry for Docker Images
resource "google_artifact_registry_repository" "repo" {
  location      = var.region
  repository_id = "coriolis-explorer"
  description   = "Docker repository for Coriolis Explorer"
  format        = "DOCKER"
}

# 2. Cloud Run Service
resource "google_cloud_run_v2_service" "default" {
  name     = "coriolis-explorer"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.repository_id}/app:latest"
      ports {
        container_port = 8080
      }
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }
}

# 3. Allow Public Access (Unauthenticated)
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  location = google_cloud_run_v2_service.default.location
  name     = google_cloud_run_v2_service.default.name
  role     = "roles/run.viewer"
  member   = "allUsers"
}

output "url" {
  value = google_cloud_run_v2_service.default.uri
}
