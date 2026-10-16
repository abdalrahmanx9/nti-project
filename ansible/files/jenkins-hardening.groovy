import jenkins.model.Jenkins
import hudson.model.Node
import hudson.model.Slave
import hudson.slaves.DumbSlave
import hudson.slaves.JNLPLauncher
import hudson.slaves.RetentionStrategy

def instance = Jenkins.get()

// 1. Enforce native Content Security Policy (resolves CSP Recommendation naturally)
try {
    def cspClass = Class.forName("jenkins.security.csp.impl.CspConfiguration")
    def cspCfg = hudson.ExtensionList.lookupSingleton(cspClass)
    cspCfg.setEnforce(true)
    cspCfg.save()
    println("--> Native Content Security Policy enforced.")
} catch (Exception e) {
    println("--> Could not configure CSP: " + e.message)
}

// 2. Set controller built-in node executors to 0 (Security Best Practice)
instance.setNumExecutors(0)
println("--> Controller built-in node executors set to 0.")

// 3. Create dedicated build-agent node for distributed builds
def existingNode = instance.getNode("build-agent")
if (existingNode == null) {
    Slave agent = new DumbSlave(
        "build-agent",
        "/home/ubuntu/jenkins-agent",
        new JNLPLauncher(true) // true = WebSocket
    )
    agent.setNumExecutors(2)
    agent.setMode(Node.Mode.NORMAL)
    agent.setLabelString("build-agent linux docker")
    agent.setRetentionStrategy(RetentionStrategy.Always.INSTANCE)
    instance.addNode(agent)
    println("--> Dedicated build-agent node configured.")
} else {
    println("--> build-agent node already configured.")
}

instance.save()

// 4. Save agent secret to disk for the systemd agent service
try {
    def secret = instance.getNode("build-agent")?.toComputer()?.getJnlpMac()
    if (secret != null) {
        def secretFile = new File("/var/lib/jenkins/agent-secret.txt")
        secretFile.text = secret
        secretFile.setReadable(true, false)
        println("--> Agent secret written to /var/lib/jenkins/agent-secret.txt")
    }
} catch (Exception e) {
    println("--> Could not write agent secret: " + e.message)
}

println("--> Jenkins hardening & distributed build configuration saved.")
