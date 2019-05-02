import * as vscode from 'vscode';
import { spawn, ChildProcess, exec } from 'child_process';

type PopOSTheme = "dark" | "light" | "unknown";

const DCONF_KEY = "/org/gnome/desktop/interface/gtk-theme";
const WORKBENCH_THEME = "workbench.colorTheme";

let watcher: ChildProcess | null = null

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

function whichPopOSTheme(input: string) : PopOSTheme {
    if (/Pop-dark/.test(input)) return "dark";
    if (/Pop/.test(input)) return "light";
    return "unknown";
}

function applyTheme(theme: string) {
    if (theme !== getCurrentTheme()) {
        vscode.workspace.getConfiguration().update(WORKBENCH_THEME, theme, true);
    }
} 

function getCurrentTheme(): string {
    return vscode.workspace.getConfiguration().get(WORKBENCH_THEME) || "";
}

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
    manual();
    startWatcher();
}

export function deactivate() {
    console.log("Killing watcher");
    if (watcher !== null) {
        watcher.kill();
        watcher = null;
    }
}
