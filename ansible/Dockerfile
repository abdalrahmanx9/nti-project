FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssh-client \
    sshpass \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir ansible

WORKDIR /ansible
ENV ANSIBLE_CONFIG=/ansible/ansible.cfg
