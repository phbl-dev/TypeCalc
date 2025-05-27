This is a thesis project based on the book "Spreadsheet Implementation Technology: Basics and extensions" written by Peter Sestoft.

Documentation exists within the code itself, or as part of the associated thesis report, which are found as a .tex file.

The project is an adaption of the accompanied C# code, 
which has been rewritten entirely in Typescript and react, 
can either be run locally using a typescript compiler or 
alternatively using docker with the following command from the root folder ```./```:

``` docker compose up --build ```

_**Note that this requires docker to be installed and active in order to work**._

Afterwards, go to the url:
http://localhost:5173. 

Please remember to close down Docker afterwards, as it consumes an enormous amount of power otherwise.

This is down by writing:

```docker compose down```


To see the Vitest test coverage of the back-end run:
    npx vitest run --coverage --coverage.include="src/back-end/**/*"

