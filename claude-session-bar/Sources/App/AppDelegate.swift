import AppKit

class AppDelegate: NSObject, NSApplicationDelegate {

    private var statusItem: NSStatusItem!
    private let sessionService = SessionService()

    func applicationDidFinishLaunching(_ notification: Notification) {
        setupStatusItem()
    }

    private func setupStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        if let button = statusItem.button {
            button.image = NSImage(systemSymbolName: "message.badge", accessibilityDescription: "Claude Sessions")
            button.action = #selector(statusItemClicked)
            button.target = self
        }
    }

    @objc private func statusItemClicked() {
        let menu = buildMenu()
        statusItem.menu = menu
        statusItem.button?.performClick(nil)

        // Reset menu after click to allow future clicks
        DispatchQueue.main.async {
            self.statusItem.menu = nil
        }
    }

    private func buildMenu() -> NSMenu {
        let menu = NSMenu()

        // Refresh sessions
        let sessions = sessionService.getRunningSessions()

        if sessions.isEmpty {
            let noItem = NSMenuItem(title: "No Running Sessions", action: nil, keyEquivalent: "")
            noItem.isEnabled = false
            menu.addItem(noItem)
        } else {
            for session in sessions {
                let title = "\(session.name) - \(session.cwd)"
                let item = NSMenuItem(title: title, action: #selector(switchToSession(_:)), keyEquivalent: "")
                item.target = self
                item.representedObject = session

                // Add summary as tooltip
                if !session.summary.isEmpty {
                    item.toolTip = "Summary: \(session.summary)"
                }

                menu.addItem(item)
            }
        }

        menu.addItem(NSMenuItem.separator())

        // Open new Claude session
        let newItem = NSMenuItem(title: "New Claude Session", action: #selector(newSession), keyEquivalent: "n")
        newItem.target = self
        menu.addItem(newItem)

        menu.addItem(NSMenuItem.separator())

        // Quit
        let quitItem = NSMenuItem(title: "Quit", action: #selector(quitApp), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)

        return menu
    }

    @objc private func switchToSession(_ sender: NSMenuItem) {
        guard let session = sender.representedObject as? RunningSession else { return }
        sessionService.switchToSession(session)
    }

    @objc private func newSession() {
        sessionService.openNewSession()
    }

    @objc private func quitApp() {
        NSApplication.shared.terminate(nil)
    }
}
