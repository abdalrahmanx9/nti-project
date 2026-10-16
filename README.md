# NTI DevOps Final Project: End-to-End Cloud Platform

Welcome to the **NTI DevOps Final Project** repository! This project implements an enterprise-grade, automated DevOps platform on **Amazon Web Services (AWS)** using modern Infrastructure as Code (IaC), GitOps, Zero-Trust security, CI/CD automation, and full-stack observability.

---

## 🏗️ Architecture Overview

The system is designed with a strict separation between **Application Source Code**, **Cloud Infrastructure**, **Continuous Integration (CI)**, and **Continuous Delivery (CD / GitOps)**.

```
                      +---------------------------------------+
                      |       Developer Git Commit / PR       |
                      +-------------------+-------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        Jenkins CI Automation (EC2 Server)                         |
|  1. SCM Checkout  ->  2. Ruff Lint & Pytest  ->  3. SonarQube Quality Gate        |
|  4. Docker Build  ->  5. Trivy CVE Scan      ->  6. Push to Amazon ECR (Private)  |
|  7. Update Image Tag in Dedicated GitOps Repository                               |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                       Amazon EKS Cluster (Kubernetes 1.30)                        |
|                                                                                   |
|  +--------------------+         +----------------------------------------------+  |
|  | ArgoCD GitOps Controller      |  | Kubernetes Gateway API (amazon-vpc-lattice)   |  |
|  | - Watches GitOps Repo        |  | - Replaces legacy Ingress                     |  |
|  | - Self-healing & Zero Drift  |  | - Routes public HTTP traffic to App Pods      |  |
|  +--------------------+         +----------------------------------------------+  |
|                                                                                   |
|  +--------------------+         +----------------------------------------------+  |
|  | App Pods (Replica 2-6)        |  | Karpenter Autoscaler                          |  |
|  | - Python FastAPI Dashboard   |  | - Just-In-Time EC2 Fleet provisioning         |  |
|  | - Non-root execution (UID 10001) | - Scales cluster in < 45 seconds            |  |
|  | - Auto-scaled via HPA (CPU>75%) |                                              |  |
|  +--------------------+         +----------------------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Zero-Trust NetworkPolicies: Blocks all ingress/egress except DNS & RDS:5432  |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------+-----------------------------------------+
                                          |
                     +--------------------+--------------------+
                     |                                         |
                     v                                         v
+---------------------------------------+   +---------------------------------------+
|        AWS RDS PostgreSQL Database    |   |         AWS Secrets Manager           |
| (Private Subnets, restricted to EKS)  |   | (Syncs DB password via ExternalSecret)|
+---------------------------------------+   +---------------------------------------+
```

---

## 📁 Repository Structure

```
.
├── app/                        # Python Web Application & Tests
│   ├── main.py                 # FastAPI application with dashboard & /metrics
│   ├── config.py               # Pydantic environment configuration
│   ├── database.py             # PostgreSQL connection with live latency metric
│   ├── metrics.py              # Prometheus metrics collector
│   ├── Dockerfile              # Multi-stage build powered by Astral uv
│   ├── templates/ & static/    # Dark-mode responsive dashboard UI
│   └── tests/                  # Automated unit test suite with pytest
│
├── terraform/                  # Modular Infrastructure as Code (IaC)
│   ├── main.tf                 # Root module orchestrating all AWS resources
│   ├── versions.tf             # S3 backend with native S3 locking (use_lockfile)
│   ├── terraform.tfvars.example# Template for input variables
│   └── modules/                # VPC, EKS, RDS, Secrets Manager, EC2, ECR, S3, Backup
│
├── ansible/                    # Configuration Management
│   ├── jenkins_setup.yml       # Jenkins LTS 2.580.1, Java 21, Docker, kubectl, Helm, Trivy
│   ├── cloudwatch_agent.yml    # AWS CloudWatch telemetry streaming
│   ├── inventory.example.ini   # Template for EC2 target host connection
│   └── run-playbook.ps1        # Docker-based runner script (runs on any OS)
│
├── charts/nti-app/             # Production Helm Chart
│   ├── Chart.yaml              # Chart metadata
│   ├── values.yaml             # Configurable values (replicas, image, resources)
│   └── templates/              # Deployment, Service, Gateway, HTTPRoute, HPA, ESO
│
├── k8s/                        # Cluster Platform Manifests
│   ├── network-policies/       # Zero-Trust security (Default Deny, Ingress, Egress)
│   ├── karpenter/              # Fast node autoscaling (NodePool & EC2NodeClass)
│   └── argocd/                 # GitOps Application tracking the deployment repo
│
├── monitoring/                 # Observability Stack
│   ├── prometheus-rules.yaml   # PrometheusRule: CPU/RAM > 80% alarms
│   ├── alertmanager-config.yaml# Alertmanager webhook notification routing
│   └── grafana-dashboard.json  # Provisioned dashboard with thresholds & latency
│
├── Jenkinsfile                 # 7-Stage Multi-Branch Declarative CI/CD Pipeline
└── docker-compose.yml          # Local multi-container development environment
```

---

## ⚙️ Prerequisites

Before running this project, ensure you have the following installed on your machine:

1. **Git**: [Download Git](https://git-scm.com/)
2. **AWS CLI v2**: Configured with administrator or appropriate IAM credentials:
   ```bash
   aws configure
   ```
3. **Terraform (>= 1.10.0)**: [Download Terraform](https://developer.hashicorp.com/terraform/downloads)
4. **Docker Desktop**: [Download Docker](https://www.docker.com/products/docker-desktop/)
5. **kubectl (v1.30)** & **Helm (v3)**:
   ```bash
   # On Windows via winget
   winget install Kubernetes.kubectl
   winget install Helm.Helm
   ```

---

## 🚀 Step-by-Step Deployment Guide for Colleagues

Follow these steps sequentially to deploy the full stack.

### Step 1: Clone the Repository & Setup Git

```bash
git clone <YOUR_PUBLIC_REPO_URL> nti-project
cd nti-project
```

---

### Step 2: Test the Application Locally (Docker Compose)

Before deploying to the cloud, verify that the application and PostgreSQL work locally:

```bash
# Launch the Python App + PostgreSQL local container stack
docker compose up --build -d

# Check status
docker compose ps
```

- Open your browser at [http://localhost:8000](http://localhost:8000) to view the live dashboard.
- View Prometheus metrics at [http://localhost:8000/metrics](http://localhost:8000/metrics).
- Stop the local stack when done:
  ```bash
  docker compose down
  ```

---

### Step 3: Provision AWS Infrastructure with Terraform

1. Navigate to the terraform directory:
   ```bash
   cd terraform
   ```

2. Copy the example variables file:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

3. Open `terraform.tfvars` and set your keypair name and configuration:
   ```hcl
   aws_region            = "us-east-1"
   environment           = "production"
   jenkins_ssh_key_name  = "your-ec2-keypair"  # Must exist in AWS us-east-1
   ```

4. Initialize and apply Terraform:
   ```bash
   terraform init
   terraform apply
   ```
   *Type `yes` when prompted.*

5. Note the outputs produced by Terraform:
   - `jenkins_public_ip` (e.g., `98.86.85.33`)
   - `eks_cluster_name` (`nti-devops-eks`)
   - `ecr_repository_url`
   - `rds_address`

---

### Step 4: Configure the Jenkins Server via Ansible

1. Navigate to the `ansible` folder:
   ```bash
   cd ../ansible
   ```

2. Copy the inventory template:
   ```bash
   cp inventory.example.ini inventory.ini
   ```

3. Edit `inventory.ini` with your Jenkins IP and the path to your `.pem` key:
   ```ini
   [jenkins_servers]
   jenkins_master ansible_host=YOUR_JENKINS_PUBLIC_IP ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/your-key.pem
   ```

4. Execute the Jenkins setup playbook (using the cross-platform runner script):
   ```powershell
   .\run-playbook.ps1 jenkins_setup.yml
   ```
   *This automatically installs Java 21, Jenkins LTS, Docker CE, AWS CLI v2, kubectl, Helm, and Trivy.*

5. Install and start the AWS CloudWatch telemetry agent:
   ```powershell
   .\run-playbook.ps1 cloudwatch_agent.yml
   ```

6. Access your live Jenkins web console:
   - **URL**: `http://YOUR_JENKINS_PUBLIC_IP:8080`
   - **Initial Admin Password**: Displayed at the end of the playbook recap, or viewable on the server at:
     ```bash
     ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_JENKINS_PUBLIC_IP 'sudo cat /var/lib/jenkins/secrets/initialAdminPassword'
     ```

---

### Step 5: Connect `kubectl` to your AWS EKS Cluster

Update your local kubeconfig to point to the newly created EKS cluster:

```bash
aws eks update-kubeconfig --region us-east-1 --name nti-devops-eks

# Verify connection to worker nodes
kubectl get nodes -o wide
```

---

### Step 6: Deploy Application using Helm & Gateway API

1. Navigate back to project root and deploy the Helm chart:
   ```bash
   helm upgrade --install nti-app ./charts/nti-app \
     --set image.tag=latest \
     --namespace default
   ```

2. Inspect your deployed Gateway, HTTPRoute, and Pods:
   ```bash
   kubectl get gateway,httproute -n default
   kubectl get pods -l app.kubernetes.io/name=nti-app
   ```

---

### Step 7: Apply Zero-Trust Network Policies & Autoscaling

1. Enforce Zero-Trust network containment:
   ```bash
   kubectl apply -f k8s/network-policies/
   ```
   *This blocks all unauthorized East-West and North-South traffic, allowing pods to communicate strictly with CoreDNS (port 53) and RDS PostgreSQL (port 5432).*

2. Apply Karpenter NodePool autoscaling:
   ```bash
   kubectl apply -f k8s/karpenter/
   ```

---

### Step 8: Configure ArgoCD GitOps Continuous Delivery

In production GitOps, ArgoCD tracks a **dedicated GitOps repository** (separated from application code) where environment values live:

1. Create a repository on GitHub (e.g., `https://github.com/<your-org>/nti-devops-gitops.git`) containing the `charts/nti-app` directory.
2. Update the `repoURL` in [k8s/argocd/application.yaml](file:///f:/mywork/NTI%20Project/k8s/argocd/application.yaml) to point to your GitOps repository.
3. Apply the ArgoCD Application manifest:
   ```bash
   kubectl apply -f k8s/argocd/application.yaml
   ```
   *ArgoCD will continuously monitor Git, detect new image tags, and synchronize deployments automatically.*

---

### Step 9: Configure Monitoring & Observability

1. Apply Prometheus alerting rules (triggers if Pod CPU or RAM exceeds 80%):
   ```bash
   kubectl apply -f monitoring/prometheus-rules.yaml
   ```

2. Apply Alertmanager webhook routing:
   ```bash
   kubectl apply -f monitoring/alertmanager-config.yaml
   ```

3. Import the Grafana dashboard:
   - In your Grafana UI, click **Dashboards** $\rightarrow$ **Import**.
   - Upload [monitoring/grafana-dashboard.json](file:///f:/mywork/NTI%20Project/monitoring/grafana-dashboard.json).
   - This provides visual gauges for active replicas, database query latency, HTTP throughput, and resource limits with 80% alarm lines.

---

## 🔒 Security Best Practices Implemented

- **No Hardcoded Secrets**: Database credentials are generated dynamically by Terraform into **AWS Secrets Manager** and synced into Kubernetes via the **External Secrets Operator (ESO)**.
- **Non-Root Containers**: Docker containers run under UID `10001` with read-only root filesystems and dropped Linux capabilities.
- **Vulnerability Scanning**: Every container image is scanned by **Trivy** in the Jenkins pipeline prior to publishing.
- **Zero-Trust NetworkPolicies**: Network policies isolate application workloads, preventing lateral movement in case of a breach.
- **Native State Locking**: Terraform state uses S3 conditional writes (`use_lockfile = true`) eliminating the need for a separate DynamoDB table.

---

## 🧹 Teardown & Clean Up

To avoid incurring ongoing AWS charges when you finish testing:

```bash
# 1. Uninstall Helm release
helm uninstall nti-app

# 2. Destroy AWS Infrastructure via Terraform
cd terraform
terraform destroy -auto-approve
```

---

## 👥 Authors & Acknowledgments
- **Project**: NTI Final DevOps Project
- **Specialization**: Cloud Architecture, Kubernetes, GitOps, and CI/CD Automation
