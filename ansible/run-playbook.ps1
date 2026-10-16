# Helper script to execute Ansible playbooks seamlessly from Windows via Docker
param (
    [Parameter(Mandatory=$false, Position=0)]
    [string]$Playbook = "jenkins_setup.yml"
)

Write-Host "Executing Ansible playbook '$Playbook' against Jenkins EC2 target..." -ForegroundColor Cyan

docker run --rm -i `
  -v "${PWD}:/ansible" `
  -v "$env:USERPROFILE\.ssh:/tmp/.ssh:ro" `
  -e ANSIBLE_HOST_KEY_CHECKING=False `
  nti-ansible-runner `
  sh -c "mkdir -p /root/.ssh && cp /tmp/.ssh/nti-devops-key.pem /root/.ssh/nti-devops-key.pem && chmod 600 /root/.ssh/nti-devops-key.pem && ansible-playbook -i inventory.ini $Playbook"
