#!groovy
import jenkins.model.*
import hudson.security.*

def instance = Jenkins.get()

// 1. Set Jenkins root URL to prevent CLI 403 errors
def locationConfig = jenkins.model.JenkinsLocationConfiguration.get()
locationConfig.setUrl("http://98.86.85.33:8080/")
locationConfig.save()

// 2. Configure Security Realm with admin user
def realm = instance.getSecurityRealm()
if (!(realm instanceof HudsonPrivateSecurityRealm)) {
    realm = new HudsonPrivateSecurityRealm(false)
    instance.setSecurityRealm(realm)
}

def adminUser = hudson.model.User.get("admin", false)
if (adminUser == null) {
    def secretFile = new File("/var/lib/jenkins/secrets/initialAdminPassword")
    def password = secretFile.exists() ? secretFile.text.trim() : java.util.UUID.randomUUID().toString()
    realm.createAccount("admin", password)
    println("--> Admin account initialized from local host secret.")
}

// 3. Configure Authorization Strategy (Allow anonymous read for GitHub webhook push notifications)
def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
strategy.setAllowAnonymousRead(true)
instance.setAuthorizationStrategy(strategy)

instance.save()
println("--> Jenkins security and root URL configured successfully!")
