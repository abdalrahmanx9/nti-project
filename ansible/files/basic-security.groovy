#!groovy
import jenkins.model.*
import hudson.security.*

def instance = Jenkins.get()

// Configure security realm with admin user
def realm = new HudsonPrivateSecurityRealm(false)
realm.createAccount("admin", "admin")
instance.setSecurityRealm(realm)

// Set full control for logged-in users
def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
strategy.setAllowAnonymousRead(false)
instance.setAuthorizationStrategy(strategy)

instance.save()
println("--> Admin user configured successfully with username 'admin' and password 'admin'")
