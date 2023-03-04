import { App, Editor, Modal, Notice, Plugin, Setting, sanitizeHTMLToDom } from 'obsidian';
import { replacements, combiningmarks, subsuperscripts } from './data.ts';

export default class LaTeXtoUnicode extends Plugin {
  async onload() {
    this.addCommand({
      id: "latex-to-unicode",
      name: "LaTeX to Unicode",
      editorCallback: (editor: Editor) => {

        const onSubmit = (res: string) => {
          const pos = editor.getCursor();
          editor.replaceRange(`${res}`, pos);
          editor.setCursor(pos);
        };

        new LaTeXToUnicodeModal(this.app, onSubmit).open();
      },
    });
  }
}


export class LaTeXToUnicodeModal extends Modal {
  res: string;

  onSubmit: (res: string) => void;

  constructor(
    app: App,
    onSubmit: (res: string) => void
  ) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h1", { text: "LaTeX to Unicode" });

    const elContainer = contentEl.createEl('table');
    elContainer.className = 'inputTable';
    const first = elContainer.createEl('tr');
    first.createEl('td', {text: 'LaTeX command'});
    const elInput = first.createEl('td').createEl('input', {type: 'text'});
    elInput.id = 'userInput';
    elInput.addEventListener("input", (e) => {
      this.res = replace(e.target.value);
      document.getElementById('resDisp').value = this.res;
    });
    const second = elContainer.createEl('tr');
    second.createEl('td', {text: 'Result'});
    const elRes = second.createEl('td').createEl('input', {type: 'text'});
    elRes.id = 'resDisp';
    elRes.readOnly = true;

    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText("Insert")
        .setCta()
        .onClick(() => {
          this.onSubmit(this.res);
        })
    );
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}


// From: https://github.com/svenkreiss/unicodeit/blob/master/ts_src/replace.ts
export function replace(f: string): string {
    // escape combining marks with a space after the backslash
    for (const ic in combiningmarks) {
        const c = combiningmarks[ic];

        let i = -1;
        while (
            (i = f.indexOf(c[0], i+1)) > -1
            && f.indexOf("}", i+1) > i
        ) {
            f = f.slice(0, i+1) + ' ' + f.slice(i+1);
        }
    }

    // console.log(replacements);
    for (const ir in replacements) {
        const r = replacements[ir];
        // dirty way of a replaceAll():
        f = f.split(r[0]).join(r[1]);

        if (r[0].slice(-2) == '{}') {
            f = f.split('\\ '+r[0].slice(1)).join(r[1]);
        }
    }

    // expand groups of subscripts: _{01234}
    let isub = -1;
    while (
        (isub = f.indexOf("_{", isub+1)) > -1
        && f.indexOf("}", isub+1) > isub
    ) {
        f = f.slice(0, isub) + '_' + f[isub+2] + '_{' + f.slice(isub+3);
        f = f.replace('_{}', '');
    }

    // expand groups of superscripts: ^{01234}
    let isup = -1;
    while (
        (isup = f.indexOf("^{", isup+1)) > -1
        && f.indexOf("}", isup+1) > isup
    ) {
        f = f.slice(0, isup) + '^' + f[isup+2] + '^{' + f.slice(isup+3);
        f = f.replace('^{}', '');
    }

    // now replace subsuperscripts
    for (const ir in subsuperscripts) {
        const r = subsuperscripts[ir];
        // dirty way of a replaceAll():
        f = f.split(r[0]).join(r[1]);
    }

    // combining marks (unicode char modifies previous char)
    for (const ic in combiningmarks) {
        const c = combiningmarks[ic];

        let i = -1;
        while (
            (i = f.indexOf('\\ '+c[0].slice(1)+'{', i+1)) > -1
            && f.indexOf("}", i+1) > i
        ) {
            const newString = f[i+c[0].length+2] + c[1];
            f = f.slice(0,i)+newString+f.slice(i+1+c[0].length+3);
        }
    }

    return f;
}
