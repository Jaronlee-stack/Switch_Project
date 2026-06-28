# Setting Up Node.js and Installing Project Dependencies

This guide is for users who have **never used Node.js or npm before**.

---

# Prerequisites

* A computer running **Windows**, **macOS**, or **Linux**
* An internet connection
* A terminal application:

  * **Windows:** Command Prompt, PowerShell, or Windows Terminal
  * **macOS:** Terminal
  * **Linux:** Terminal

---

# Step 1: Install Node.js

Node.js includes **npm (Node Package Manager)**, so installing Node.js will automatically install npm.

1. Visit the official Node.js website:

   https://nodejs.org/

2. Download the **LTS (Long-Term Support)** version.

   > Do **not** download the "Current" version unless instructed.

3. Run the installer.

4. Keep the default installation options and click **Next** until installation completes.

5. Click **Finish**.

---

# Step 2: Verify the Installation

Open a new terminal and run:

```bash
node -v
```

You should see something similar to:

```text
v22.15.0
```

Next, verify npm:

```bash
npm -v
```

Example output:

```text
10.9.2
```

If both commands display version numbers, the installation was successful.

---

# Step 3: Download the Project

Clone the repository or download the project ZIP.

If using Git:

```bash
git clone <repository-url>
```

Then navigate into the project folder:

```bash
cd <project-folder>
```

Example:

```bash
cd my-project
```

---

# Step 4: Install Project Dependencies

Inside the project folder, run:

```bash
npm install
```

npm will read the project's `package.json` file and automatically install all required packages.

This may take a few minutes on the first run.

After installation completes, a new folder named:

```text
node_modules/
```

will be created automatically.

> **Do not edit anything inside the `node_modules` folder.**

---

# Step 5: Verify Installation

You should now see a folder structure similar to:

```text
my-project/
│
├── node_modules/
├── package.json
├── package-lock.json
├── src/
└── ...
```

The project dependencies are now installed.

---

# Step 6: Create a `.gitignore` File

The `node_modules` folder is very large and **should never be committed to Git**.

If the project does not already contain a `.gitignore` file, create one in the project's root directory.

Example:

```text
my-project/
├── .gitignore
├── package.json
├── package-lock.json
└── node_modules/
```

Open the `.gitignore` file and add the following:

```gitignore
node_modules/
```

This tells Git to ignore the `node_modules` folder.

You may also wish to ignore other common files:

```gitignore
node_modules/

.env

.DS_Store

.vscode/
```

---

# Step 7: Check Git Status

Run:

```bash
git status
```

You should **NOT** see `node_modules` listed under files to be committed.

You should only see files that belong to your project, such as:

```text
package.json
package-lock.json
src/
README.md
```

---

# Common Commands

Install dependencies:

```bash
npm install
```

Install a new package:

```bash
npm install <package-name>
```

Example:

```bash
npm install express
```

Install a package for development only:

```bash
npm install --save-dev <package-name>
```

Example:

```bash
npm install --save-dev nodemon
```

Update installed packages:

```bash
npm update
```

Remove a package:

```bash
npm uninstall <package-name>
```

---

# Troubleshooting

## `'node' is not recognized as an internal or external command`

* Restart your terminal after installing Node.js.
* If the problem persists, restart your computer.
* Reinstall Node.js if necessary.

---

## `'npm' is not recognized`

npm is installed together with Node.js.

Verify that Node.js was installed correctly by running:

```bash
node -v
```

If this does not work, reinstall Node.js.

---

## `npm install` fails

Try clearing the npm cache:

```bash
npm cache clean --force
```

Then run:

```bash
npm install
```

---

## Missing `package.json`

The command:

```bash
npm install
```

must be run inside the project folder that contains:

```text
package.json
```

Navigate into the correct folder first:

```bash
cd <project-folder>
```

---

# You're Ready!

Once `npm install` finishes successfully, your project dependencies are installed and you're ready to run the project using the instructions provided by your project (for example, `npm start`, `npm run dev`, or another npm script).
