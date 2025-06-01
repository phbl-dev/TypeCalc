# TypeCalc version 0.0

## About

TypeCalc is a thesis-related project that was started in Spring 2025 based on the book: "Spreadsheet Implementation Technology: Basics and Extensions" (2014) written by Peter Sestoft, as well as the accompanying C# implementation "CoreCalc"

The reasoning for the project lies in a desire to create an open-source spreadsheet implementation in TypeScript that is well-documented, tested and make use of the QT4 simplified quad-tree as described by Peter Sestoft.

TypeCalc is a browser-based implementation, which allows users to run a spreadsheet locally in their own browser.

## File Structure

Throughout the project, we have maintained the following file structuring:

- `.github/`
    - `workflows`: Used for Continuous integration implementation and yaml scripting.
- `docs/`: Contains the documentation for TypeCalc.
- `E2E/`: Contains the playwright logic for System testing.
- `extra_files/`: various files, that have been used to test I/O functionality and benchmarking.
- `test/`: Contains the Vitest logic for Unit and Component testing.
- `src/`: Source folder for the business logic behind TypeCalc.
    - `api-layer/`: Contains the logic that allows the front-end to communicate with the backend.
    - `back-end/`: Houses the back-end files, which provide the functionality for spreadsheets.
    - `front-end/`: Houses the front-end files. These are responsible for the GUI.

<h2> Documentation </h2>
We include documentation for TypeCalc. In this current version, we do not include any documentation for specialized classes that inherit from an abstract class.
Instead, we include documentation for these abstract classes, and usethis documentation for the specialized classes.
Furthermore, we do not include documentation for private methods and getter/setter methods. Mostly, their behaviour is obvious from the context.

<h2> How to run </h2>
TypeCalc can be run in the repository in one of two ways:

1. If the user has installed TypeScript, node.js, and the package manager npm, the project can be run using these two commands while being located in the root folder `./`:

    ```!/bin/bash
        npm install
        npm run dev
    ```

    Which should create a server on the address: http://localhost:5173/

2. Alternatively, we provide a docker compose file, which only requires the user to have docker installed on their system. If docker is installed, then the user can simply use `docker compose up --build`, which will compile and run the server on the same localhost connection as previously described.

    _**Remember to kill both the server and docker when done using TypeCalc, as this will otherwise consume a lot of ressources on the host system. The server can be shutdown using the command: `docker compose down` followed by `docker image rm $(docker image ls -q "spreadsheet*")` to remove the image completely.**_

Depending on your setup and your motivations for using TypeCalc, we recommend that the first option is used if the user wants to contribute to the project, and the other option if the goal is simply to use TypeCalc.

## Testing & Coverage

If TypeScript, npm, and node.js is installed, tests can also be run. For Unit and Component tests, tests are run using `npx vitest run`. For System Testing, we make use of `npx playwright test --ui`. We recommend using the `--ui` option to visualize where the bugs are found.

To see the Vitest test coverage of the back-end run:
`npx vitest run --coverage --coverage.include="src/back-end/**/*"`
