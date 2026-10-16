# NTI DevOps Final Project: Enterprise Cloud-Native Platform

Welcome to the **NTI DevOps Final Project** repository! This project implements an enterprise-grade, automated DevOps platform on **Amazon Web Services (AWS)** using modern Infrastructure as Code (IaC), GitOps continuous delivery, Zero-Trust security, CI/CD automation, and full-stack observability.

---

## 🧭 Platform Access Directory

| Tool / Component | Access URL / Port-Forward | Authentication Method | Primary Function |
| :--- | :--- | :--- | :--- |
| **Production Web App** | **`http://<CUSTOM_DOMAIN_OR_LB>`** | Public Internet Access | Production FastAPI Telemetry & Load Generator |
| **Interactive API Docs**| **`http://<CUSTOM_DOMAIN_OR_LB>/docs`** | Public Swagger UI | Test `/api/status`, `/healthz`, `/api/simulate-load` |
| **Jenkins CI/CD** | **`http://<JENKINS_HOST>:8080`** | `admin` / dynamically generated | Multi-branch CI/CD Pipeline & Automated Scans |
| **ArgoCD GitOps** | **`https://localhost:8081`** | `admin` / secret `argocd-initial-admin-secret` | GitOps Sync from GitOps repository |
| **Grafana Dashboard** | **`http://localhost:3000`** | `admin` / set via Helm values | Real-time Workload, HPA Timeline & Alert Dashboards |
| **Prometheus Server** | **`http://localhost:9090`** | Standard access | Metrics Store, Target Discovery (`/targets`) & Alert rules |
| **Alertmanager** | **`http://localhost:9093`** | Standard access | Alert routing & Email notifications via SMTP |
| **Jenkins Server SSH**| `ssh ubuntu@<JENKINS_HOST>` | Private key authentication (`.pem`) | Direct EC2 host terminal administration |

> **Port-Forward Commands for Local Inspection**:
> - **ArgoCD**: `kubectl port-forward svc/argocd-server -n argocd 8081:443`
> - **Grafana**: `kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring`
> - **Prometheus**: `kubectl port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090 -n monitoring`
> - **Alertmanager**: `kubectl port-forward svc/prometheus-kube-prometheus-alertmanager 9093:9093 -n monitoring`

---

## 🏗️ Architecture Overview

The system is designed with a strict separation between **Application Source Code**, **Cloud Infrastructure**, **Continuous Integration (CI)**, and **Continuous Delivery (CD / GitOps)**.

```
                      +---------------------------------------+
                      |       Developer Git Commit / PR       |
                      +-------------------+-------------------+
                                          | (GitHub Webhook)
                                          v
+-----------------------------------------------------------------------------------+
|                        Jenkins CI Automation (EC2 Server)                         |
|  1. SCM Checkout  ->  2. Ruff Lint & Pytest  ->  3. Docker Multi-Stage Build       |
|  4. Trivy CVE Scan -> 5. Push to Amazon ECR  ->  6. Trigger GitOps Repository     |
|  7. Automated HTML Failure Email dispatched on failure to configured DevOps team  |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                       Amazon EKS Cluster (Kubernetes 1.30)                        |
|                                                                                   |
|  +--------------------+         +----------------------------------------------+  |
|  | ArgoCD GitOps      |         | Public AWS Elastic Load Balancer (ELB)       |  |
|  | - Watches GitOps   |         | - Maps to custom domain via DNS/Cloudflare   |  |
|  | - Zero Drift Sync  |         | - Routes traffic to nti-app Service (Port 80)|  |
|  +--------------------+         +----------------------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Kubernetes Workload & Horizontal Pod Autoscaler (HPA)                       |  |
|  | - Python FastAPI Non-Root Containers (UID 10001)                           |  |
|  | - Metrics-Server driving live CPU & Memory metrics                          |  |
|  | - Auto-scales replicas from 2 up to 6 pods during simulated load            |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Full-Stack Observability Stack (kube-prometheus-stack)                      |  |
|  | - ServiceMonitor scraping /metrics endpoint                                 |  |
|  | - Prometheus rules for CPU > 80%, RAM > 80%, DB Latency > 500ms alarms      |  |
|  | - Alertmanager sending rich HTML alert cards to configured email            |  |
|  | - Custom Grafana dashboard with HPA scaling timeline & live stress state   |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------+-----------------------------------------+
                                          |
                     +--------------------+--------------------+
                     |                                         |
                     v                                         v
+---------------------------------------+   +---------------------------------------+
|        AWS RDS PostgreSQL Database    |   |         AWS Secrets Manager           |
|  - Private Subnets, Port 5432         |   |  - Dynamic master DB password         |
|  - DB: `ntiapp` (User: `dbadmin`)     |   |  - Secret: production-rds-credentials |
+---------------------------------------+   +---------------------------------------+
```

---

## 📁 Repository Structure

```
.
├── app/                        # Python Web Application & Tests
│   ├── main.py                 # FastAPI application with dashboard, /metrics & /api/simulate-load
│   ├── config.py               # Pydantic environment configuration
│   ├── database.py             # PostgreSQL connection with live latency metric
│   ├── metrics.py              # Prometheus metrics collector (DB latency, request rates, stress state)
│   ├── Dockerfile              # Multi-stage build powered by Astral uv
│   ├── templates/ & static/    # Dark-mode responsive dashboard UI & live event stream
│   └── tests/                  # Automated unit test suite with pytest
│
├── terraform/                  # Modular Infrastructure as Code (IaC)
│   ├── main.tf                 # Root module orchestrating all AWS resources
│   ├── versions.tf             # S3 backend with native S3 locking (use_lockfile)
│   ├── terraform.tfvars.example# Template for input variables
│   └── modules/                # VPC, EKS, RDS, Secrets Manager, EC2, ECR, S3, Backup
│
├── ansible/                    # Configuration Management
│   ├── jenkins_setup.yml       # Jenkins LTS, Java 21, Docker, kubectl, Helm, Trivy
│   ├── cloudwatch_agent.yml    # AWS CloudWatch telemetry streaming
│   ├── inventory.example.ini   # Template for EC2 target host connection
│   └── run-playbook.ps1        # Cross-platform playbook execution runner
│
├── charts/nti-app/             # Production Helm Chart
│   ├── Chart.yaml              # Chart metadata
│   ├── values.yaml             # Configurable values (replicas, image, LoadBalancer, probes)
│   └── templates/              # Deployment, Service, ServiceMonitor, HPA, Secret references
│
├── monitoring/                 # Observability & Alerting Stack
│   ├── prometheus-rules.yaml   # PrometheusRule: CPU/RAM > 80%, DB Latency alarms
│   ├── alertmanager-config.yaml# AlertmanagerConfig: HTML email routing via SMTP
│   └── grafana-dashboard.json  # Comprehensive Grafana dashboard with HPA scaling timeline
│
├── scripts/                    # Automation Scripts
│   └── send_failure_email.py   # Python HTML email sender for Jenkins pipeline failures
│
├── Jenkinsfile                 # 7-Stage Declarative CI/CD Pipeline with HTML alert notifications
└── docker-compose.yml          # Local multi-container development environment
```

---

## ⚡ Live Load Simulation & HPA Auto-Scaling Demo

To demonstrate auto-scaling and Prometheus threshold alarms during project evaluation:

1. **Open the Dashboards**:
   - Web App UI: Access via load balancer or custom domain.
   - Grafana: View the *Pod CPU Utilization* & *HPA Timeline* panels.
2. **Trigger Load Simulation**:
   - In the web app, click **Simulate Load (>80% Stress)**, OR run via PowerShell:
     ```powershell
     kubectl exec -n default deployment/nti-app -- python -c "
     import urllib.request, json
     req = urllib.request.Request('http://localhost:8000/api/simulate-load', data=json.dumps({'duration_seconds': 45}).encode(), headers={'Content-Type': 'application/json'}, method='POST')
     resp = urllib.request.urlopen(req)
     print(resp.read().decode())
     "
     ```
3. **What to Observe**:
   - **Frontend App**: Countdown badge activates (`🔥 Simulating Load (45s remaining)...`) and alarm pill turns red.
   - **Grafana**:
     - *Simulated Stress State* switches from green `IDLE` to flashing red `🔥 STRESS ACTIVE (>80%)`.
     - *Pod CPU Utilization* climbs above the red **80% Threshold line**.
     - *HPA Pod Auto-Scaling Timeline* visually steps up from **2 to 6 replicas**.
   - **Kubernetes CLI**:
     ```powershell
     kubectl get hpa -n default -w
     ```
     Watch `REPLICAS` scale from `2` up to `6`.
   - **Cooldown**: After 45s, CPU drops to baseline and Kubernetes HPA safely scales replicas back down after the stabilization window.

---

## 📧 Automated Notification System

Both the **CI/CD Pipeline** and the **Kubernetes Monitoring Stack** send styled HTML emails to configured alert recipients:

### 1. Jenkins Pipeline Failure Notification
- Triggered automatically if any pipeline stage (linting, tests, build, CVE scan, ECR push) fails.
- Sends a dark-themed HTML card with the build number, branch, commit author, failing stage, and a direct button link to the Jenkins console logs.
- Configured via environment variables: `ALERT_RECIPIENT_EMAIL`, `SMTP_USER`, `SMTP_PASSWORD`.

### 2. Prometheus Alertmanager Notification
- Triggered if:
  - Pod CPU utilization > 80% for > 5m (`PodCPUUsageOver80Percent`)
  - Pod RAM utilization > 80% for > 5m (`PodMemoryUsageOver80Percent`)
  - RDS PostgreSQL ping latency > 500ms (`DatabaseQueryLatencyHigh`)
  - Application database connection lost (`AppHealthCheckFailing`)
- Dispatches styled alert cards directly to configured alert recipients via SMTP. Credentials are read from Kubernetes Secret `alertmanager-smtp-auth`.

---

## 🔒 Security Best Practices Implemented

- **Zero Plain-Text Secrets in Git**: No credentials, passwords, or personal contact info committed. Master credentials are dynamically generated by Terraform in **AWS Secrets Manager** and mounted via Kubernetes Secrets.
- **Non-Root Containers**: Docker container runs under UID `10001` with read-only root filesystems and dropped Linux capabilities.
- **Vulnerability Scanning**: Every container image is scanned by **Trivy** in the Jenkins pipeline prior to publishing to AWS ECR.
- **Zero-Trust NetworkPolicies**: Network policies isolate application workloads, preventing lateral movement in case of a breach.
- **Native State Locking**: Terraform state uses S3 conditional writes (`use_lockfile = true`) eliminating DynamoDB locking overhead.

---

## 🧹 Teardown & Clean Up

To avoid ongoing AWS charges when finished with evaluation:

```bash
# 1. Uninstall Helm release & Load Balancer
helm uninstall nti-app -n default

# 2. Destroy AWS Infrastructure via Terraform
cd terraform
terraform destroy -auto-approve
```

---

## 👥 Authors & Acknowledgments
- **Project**: NTI Final DevOps Project
- **Specialization**: Cloud Architecture, Kubernetes, GitOps, and CI/CD Automation
