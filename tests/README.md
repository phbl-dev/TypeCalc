## Testing 101

In this project, there will be a large emphasis on testing. As such, a series of scripts and rules are implemented in the this README file.

For each method, at least two tests are required to be made. One tests could show that the method works with the intended parameters for it,
and another could show an unintended parameter not working for it. For larger methods, that are more central the codebase as a whole,
you should make tests, that try out extreme testcases, and generally try to make 4 < tests.

In summation:

- For large methods: 4 > tests
- For smaller methods: approx. 2 tests

We have added the Vitest plugin to the eslint plugin. This means that code cannot be pushed unless all tests are passing.
This should create an additional layer of security to our project :)

### Running tests (including setup)

The following .sh script will download the latest vitest npm package (if it is not installed globally before).
If vitest is already downloaded it will simply run the test

```shell
#/bin/bash

chmod +x run-tests.sh

# Installing vitest if it not found
# Note that it is installed globally.
if [[ "$(npm list -g vitest@)" =~ "empty" ]]; then
    echo "Vitest not found, downloading..."
    npm install -g vitest
else
    echo "Vitest found, continuing"
fi

# Running the tests.
npx vitest run
```
