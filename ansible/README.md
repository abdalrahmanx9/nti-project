# Part 2: Ansible Automation Guide

This directory contains automated Ansible playbooks to provision and configure the EC2 instances created by Terraform.

---

## 📋 Playbooks Overview

1. **[`jenkins_setup.yml`](file:///f:/mywork/NTI%20Project/ansible/jenkins_setup.yml)**:
   - Installs **OpenJDK 21** & **Jenkins LTS**.
   - Installs **Docker Engine** and adds `jenkins` to the `docker` group.
   - Installs **AWS CLI v2**, **`kubectl` (v1.30)**, **`helm` (v3)**, and **`trivy`**.
   - Automates Jenkins plugin installations (`git`, `workflow-aggregator`, `github-branch-source`, `sonar`, `docker-workflow`, `amazon-ecr`, `pipeline-stage-view`).
   - Retrieves and outputs the initial admin password.

2. **[`cloudwatch_agent.yml`](file:///f:/mywork/NTI%20Project/ansible/cloudwatch_agent.yml)**:
   - Downloads and installs `amazon-cloudwatch-agent`.
   - Deploys [`files/amazon-cloudwatch-agent.json`](file:///f:/mywork/NTI%20Project/ansible/files/amazon-cloudwatch-agent.json).
   - Monitors CPU, Memory, and Disk utilization every 60s.
   - Streams `/var/log/jenkins/jenkins.log` and `/var/log/syslog` to AWS CloudWatch.

---

## 🚀 Execution Instructions & Commands

### Step 1: Obtain the Jenkins Public IP from Terraform
From the `terraform/` directory, retrieve your Jenkins server Elastic IP:
```bash
cd terraform
terraform output -raw jenkins_public_ip
```

### Step 2: Update the Ansible Inventory
Open [`ansible/inventory.ini`](file:///f:/mywork/NTI%20Project/ansible/inventory.ini) and replace:
- `YOUR_JENKINS_PUBLIC_IP` with the IP obtained in Step 1.
- `~/.ssh/your-key.pem` with your local AWS EC2 private key file path (e.g., `C:/Users/username/.ssh/my-key.pem` or `~/.ssh/my-key.pem`).

### Step 3: Test SSH Connectivity
```bash
ansible -i inventory.ini all -m ping
```

### Step 4: Run Playbook 1 (Jenkins & Toolchain Setup)
```bash
ansible-playbook -i inventory.ini jenkins_setup.yml
```
*When completed, the playbook will print your Jenkins Web URL (`http://<IP>:8080`) and the Initial Admin Password.*

### Step 5: Run Playbook 2 (CloudWatch Agent Setup)
```bash
ansible-playbook -i inventory.ini cloudwatch_agent.yml
```

---

## 💡 Running Ansible on Windows (Single-Command Helper)

We provide a convenient helper script [`run-playbook.ps1`](file:///f:/mywork/NTI%20Project/ansible/run-playbook.ps1) that automatically mounts your EC2 private key with the correct Linux permissions (`0600`) and executes the playbooks inside the pre-built `nti-ansible-runner` Docker image:

### 1. Setup Jenkins & Toolchain
```powershell
.\run-playbook.ps1 jenkins_setup.yml
```

### 2. Setup CloudWatch Agent
```powershell
.\run-playbook.ps1 cloudwatch_agent.yml
```
