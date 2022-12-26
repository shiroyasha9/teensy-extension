import fetch from 'node-fetch';
import * as vscode from 'vscode';
import { BASE_URL, ENDPOINT_URL, SECRET_KEY } from './env';

const checkURLValidity = (text: string) => {
  var urlPattern = new RegExp(
    '^(https?:\\/\\/)?' + // validate protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // validate domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))' + // validate OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // validate port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?' + // validate query string
      '(\\#[-a-z\\d_]*)?$',
    'i'
  ); // validate fragment locator
  return !!urlPattern.test(text);
};

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('teeny.teenyLink', () => {
    // ask for the link
    vscode.window
      .showInputBox({
        prompt: 'Enter a link to make it teeny',
        placeHolder: 'https://example.com',
        title: 'Teeny',
        validateInput: (value: string) => {
          if (!value || !checkURLValidity(value)) {
            return 'Please enter a valid link';
          }
          return null;
        }
      })
      .then(link => {
        // if the link is valid, then we will ask for the slug
        if (link) {
          vscode.window
            .showInputBox({
              prompt: 'Enter the alias (slug) for the teenified link',
              placeHolder: 'example',
              title: 'Teeny',
              validateInput: async (value: string) => {
                if (!value) {
                  return 'Please enter a valid slug';
                }

                const isValidResponse = await fetch(
                  `${ENDPOINT_URL}/slug-check?slug=${value}`,
                  {
                    headers: {
                      'secret-key': SECRET_KEY
                    }
                  }
                );

                const isValidData = (await isValidResponse.json()) as {
                  used: boolean;
                };

                if (isValidData.used) {
                  return 'Alias (slug) already in use, try a different one';
                }
                return null;
              }
            })
            .then(async slug => {
              if (slug) {
                const createSlugResponse = await fetch(
                  `${ENDPOINT_URL}/create-slug`,
                  {
                    headers: {
                      'secret-key': SECRET_KEY,
                      'Content-Type': 'application/json'
                    },
                    method: 'POST',
                    body: JSON.stringify({
                      slug,
                      url: link
                    })
                  }
                );

                const createSlugData = (await createSlugResponse.json()) as {
                  success: boolean;
                };
                if (createSlugData.success) {
                  vscode.env.clipboard.writeText(`${BASE_URL}/${slug}`);
                  vscode.window
                    .showInformationMessage(
                      'Teenified link successfully and copied to clipboard!',
                      'Open Link'
                    )
                    .then(value => {
                      if (value === 'Open Link') {
                        vscode.env.openExternal(
                          vscode.Uri.parse(`${BASE_URL}/${slug}`)
                        );
                      }
                    });
                }
              }
            });
        }
      });
  });

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
