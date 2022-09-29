import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
    const output = vscode.window.createOutputChannel("Import Sorter");

    const disposable = vscode.commands.registerCommand("importsorter.helloWorld", () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) return;

        interface ILine {
            text: string;
            range: vscode.Selection;
        }

        const defaultGroups: { relative: ILine[]; absolute: ILine[]; thirdParty: ILine[] } = {
            relative: [],
            absolute: [],
            thirdParty: [],
        };

        const groups = editor.document
            .getText()
            .split("\n")
            .reduce((acc, line, index) => {
                if (!line.startsWith("import")) return acc;

                const matches = line.match(/^import .* from (('.*')|(".*"));?/);

                if (!matches) return acc;

                const statement = matches[0];

                const location = line.slice(statement.indexOf(" from ") + 6).replace(/\'|"/g, "");

                const range = new vscode.Selection(
                    new vscode.Position(index, 0),
                    new vscode.Position(index, statement.length)
                );

                switch (true) {
                    case location.startsWith("."): {
                        return {
                            ...acc,
                            relative: [...acc.relative, { text: statement, range }],
                        };
                    }

                    case location.startsWith("app/"): {
                        return {
                            ...acc,
                            absolute: [...acc.absolute, { text: statement, range }],
                        };
                    }

                    default: {
                        return {
                            ...acc,
                            thirdParty: [...acc.thirdParty, { text: statement, range }],
                        };
                    }
                }
            }, defaultGroups);

        const descending = (a: ILine, b: ILine): number => b.text.length - a.text.length;

        editor.edit((editBuilder) => {
            let currentLine = -1;

            const insertStatement = ({ text, range }: ILine) => {
                editBuilder.delete(range);

                editBuilder.insert(new vscode.Position((currentLine += 1), 0), text);
            };

            if (groups.thirdParty.length > 0) {
                groups.thirdParty.sort(descending).forEach(insertStatement);
            }

            if (groups.absolute.length > 0) {
                editBuilder.insert(new vscode.Position((currentLine += 1), 0), "");

                groups.absolute.sort(descending).forEach(insertStatement);
            }

            if (groups.relative.length > 0) {
                editBuilder.insert(new vscode.Position((currentLine += 1), 0), "");

                groups.relative.sort(descending).forEach(insertStatement);
            }

            if (editor.document.lineAt(currentLine + 1).text !== "") {
                editBuilder.insert(new vscode.Position((currentLine += 1), 0), "\n");
            }
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
