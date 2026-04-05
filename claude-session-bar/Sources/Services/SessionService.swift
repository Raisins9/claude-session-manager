import Foundation

class SessionService {

    private let nodePath = "/opt/homebrew/bin/node"
    private let sessionManagerPath = "/Users/xuanye/dev/claude-session-manager/dist/index.js"

    func getRunningSessions() -> [RunningSession] {
        let output = runCommand(path: nodePath, arguments: [sessionManagerPath, "list"])

        guard !output.isEmpty else { return [] }

        // Parse the output - each session block is separated by double newlines
        let blocks = output.components(separatedBy: "\n\n")

        var sessions: [RunningSession] = []

        for block in blocks {
            let trimmed = block.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.isEmpty || trimmed.hasPrefix("Running sessions") || trimmed.hasPrefix("No running") {
                continue
            }

            let session = RunningSession(from: trimmed)
            if !session.id.isEmpty {
                sessions.append(session)
            }
        }

        return sessions
    }

    func switchToSession(_ session: RunningSession) {
        // Use AppleScript to run in Terminal
        let script = """
        tell application "Terminal"
            activate
            do script "claude -r \(session.sessionId)"
        end tell
        """
        runAppleScript(script)
    }

    func openNewSession() {
        // Use AppleScript to run in Terminal
        let script = """
        tell application "Terminal"
            activate
            do script "claude"
        end tell
        """
        runAppleScript(script)
    }

    private func runAppleScript(_ script: String) {
        var error: NSDictionary?
        if let appleScript = NSAppleScript(source: script) {
            appleScript.executeAndReturnError(&error)
        }
    }

    private func runCommand(path: String, arguments: [String]) -> String {
        let process = Process()
        let pipe = Pipe()

        process.executableURL = URL(fileURLWithPath: path)
        process.arguments = arguments
        process.standardOutput = pipe
        process.standardError = pipe

        do {
            try process.run()
            process.waitUntilExit()

            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            return String(data: data, encoding: .utf8) ?? ""
        } catch {
            return ""
        }
    }
}
