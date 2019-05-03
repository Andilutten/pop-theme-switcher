import * as vscode from 'vscode';
import { spawn, ChildProcess, exec } from 'child_process';

type PopOSTheme = "dark" | "light" | "unknown";

const DCONF_KEY = "/org/gnome/desktop/interface/gtk-theme";
const WORKBENCH_THEME = "workbench.colorTheme";

let watcher: ChildProcess | null = null

// Validate if device meets requirements
function validate(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (process.platform !== "linux") {
            return reject(new Error("Platform is not linux"))
        }
        const wh = spawn("which", ["dconf"])
        wh.on('close', code => {
            if (code != 0) {
                return reject(new Error("DConf is missing in Path"))
            }
            resolve()
        })
    })
}

// Start dconf watcher
function startWatcher() {
    if (watcher !== null) return;
    watcher = spawn('dconf', ["watch", DCONF_KEY]);
    watcher.stdout.on('data', (data: Buffer) => {
        const message = data.toString().replace("\n", "").trim();
        if (message == DCONF_KEY) return;

        switch(whichPopOSTheme(message)) {
        case "dark": applyTheme("Pop Dark"); break;
        case "light": applyTheme("Pop Color"); break;
        }
    })
}

// Returns dark or light theme
function whichPopOSTheme(input: string) : PopOSTheme {
    if (/Pop-dark/.test(input)) return "dark";
    if (/Pop/.test(input)) return "light";
    return "unknown";
}

// Apply theme on workspace
function applyTheme(theme: string) {
    if (theme !== getCurrentTheme()) {
        vscode.workspace.getConfiguration().update(WORKBENCH_THEME, theme, true);
    }
} 

// Gets the current theme
function getCurrentTheme(): string {
    return vscode.workspace.getConfiguration().get(WORKBENCH_THEME) || "";
}

// Manually checks current value. Used on startup to synchronize
function manual() {
    exec(`dconf read ${DCONF_KEY}`, (err, stdout, _) => {
        if (err) { return console.error(err); }
        switch(whichPopOSTheme(stdout)) {
        case "dark": applyTheme("Pop Dark"); break;
        case "light": applyTheme("Pop Color"); break;
        }
    })
}

export function activate(context: vscode.ExtensionContext) {
    validate()
    .then(() => {
        manual();
        startWatcher();
    })
    .catch(reason => {
        console.error(reason);
        vscode.window.showErrorMessage("This extension only works on a linux based system with dconf in $PATH")
    })
}

export function deactivate() {
    if (watcher !== null) {
        watcher.kill();
        watcher = null;
    }
}
