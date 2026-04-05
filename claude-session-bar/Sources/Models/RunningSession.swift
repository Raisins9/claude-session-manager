import Foundation

struct RunningSession: Identifiable {
    let id: String
    let name: String
    let cwd: String
    let summary: String
    let sessionId: String

    init(id: String, name: String, cwd: String, summary: String, sessionId: String) {
        self.id = id
        self.name = name
        self.cwd = cwd
        self.summary = summary
        self.sessionId = sessionId
    }

    init(from outputLine: String) {
        // Parse format: "  <id>  <name>\n  cwd: <cwd>\n  summary: <summary>"
        let lines = outputLine.components(separatedBy: "\n")

        var sessionId = ""
        var name = ""
        var cwd = ""
        var summary = ""

        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)

            if trimmed.hasPrefix("cwd:") {
                cwd = String(trimmed.dropFirst(5)).trimmingCharacters(in: .whitespaces)
            } else if trimmed.hasPrefix("summary:") {
                summary = String(trimmed.dropFirst(9)).trimmingCharacters(in: .whitespaces)
            } else if !trimmed.isEmpty && sessionId.isEmpty {
                // First non-empty line should be the session line
                let parts = trimmed.components(separatedBy: "  ")
                if parts.count >= 2 {
                    sessionId = parts[0]
                    name = parts.dropFirst().joined(separator: "  ").trimmingCharacters(in: .whitespaces)
                }
            }
        }

        self.id = sessionId
        self.sessionId = sessionId
        self.name = name.isEmpty ? cwd : name
        self.cwd = cwd
        self.summary = summary
    }
}
