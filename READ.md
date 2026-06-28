# Getting Started

This guide will help you set up the project if you have never used Node.js before.

---

## Step 1: Install Node.js

Node.js includes npm (Node Package Manager).

1. Go to https://nodejs.org/
2. Download the **LTS** version.
3. Install it using the default settings.
4. Restart your terminal after installation.

---

## Step 2: Verify Installation

Open a terminal and run:

```bash
node -v
```

You should see a version number, for example:

```text
v22.15.0
```

Next, run:

```bash
npm -v
```

You should also see a version number.

If both commands work, Node.js has been installed successfully.

---

## Step 3: Clone the Repository

Clone the project:

```bash
git clone <repository-url>
```

Move into the project folder:

```bash
cd <project-folder>
```

---

## Step 4: Install Project Dependencies

Install the project's dependencies by running:

```bash
npm install
```

After the installation completes, install MediaPipe:

```bash
npm install @mediapipe/tasks-vision
```

npm will read the `package.json` and `package-lock.json` files and install or verify all required packages.

The installation may take a few minutes.

---

## Step 5: Verify Everything Installed

You should now have the following files:

```text
project/
│
├── node_modules/
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

Your project is now ready to use.

---

## About `.gitignore`

The project already includes a `.gitignore` file.

It contains:

```gitignore
node_modules/
```

This prevents Git from uploading the `node_modules` folder to the repository.

If you create additional temporary files (such as `.env`), remember to add them to `.gitignore`.

---

## Troubleshooting

### `'node' is not recognized`

Restart your terminal or reinstall Node.js.

### `'npm' is not recognized`

Reinstall Node.js from https://nodejs.org/.

### `npm install` fails

Try:

```bash
npm cache clean --force
npm install
```

### `package.json` cannot be found

Make sure you are inside the project folder before running:

```bash
npm install
```

---

## You're Ready!

Once `npm install` completes successfully, you can continue with the project using the instructions provided by your lecturer or project documentation.