/// <summary>
/// An IOFormat determines how to read a given XML file containing a
/// spreadsheet workbook.
/// Currently, only Excel 2003 XMLSS format is supported.
/// </summary>

import type { Workbook } from "../../Workbook";

export abstract class IOFormat {
    public abstract Read(filename: string): Workbook;
    private fileExtension: string;
    private description: string;
}