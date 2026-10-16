#!groovy
import jenkins.model.*
import hudson.security.*

def instance = Jenkins.get()

// 1. Set Jenkins root URL to prevent CLI 403 errors
def locationConfig = jenkins.model.JenkinsLocationConfiguration.get()
locationConfig.setUrl("http://98.86.85.33:8080/")
locationConfig.save()

// 2. Configure Security Realm with admin user
def realm = new HudsonPrivateSecurityRealm(false)
realm.createAccount("admin", "admin")
instance.setSecurityRealm(realm)

// 3. Configure Authorization Strategy
def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
strategy.setAllowAnonymousRead(false)
instance.setAuthorizationStrategy(strategy)

instance.save()
println("--> Jenkins URL and admin user (admin/admin) successfully configured!")
