import * as XLSX from 'xlsx';
import { StudentResult, ExamConfig, Subject } from '../types/result';

// Helper to safely parse numbers, returning 0 if the value is not a valid number.
const safeParseNumber = (value: any): number => {
    if (value === null || value === undefined) {
        return 0;
    }
    const num = Number(value);
    return isNaN(num) ? 0 : num;
};

// Helper to safely parse strings, returning an empty string if the value is null or undefined.
const safeParseString = (value: any): string => {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value);
};

export const calculateGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'E';
};

export const calculateDivision = (percentage: number): string => {
    if (percentage >= 80) return 'Distinction';
    if (percentage >= 60) return 'First Division';
    if (percentage >= 50) return 'Second Division';
    if (percentage >= 40) return 'Third Division';
    return 'FAIL';
};

export const parseResultExcel = async (file: File, config: ExamConfig): Promise<StudentResult[]> => {
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = '📊 Result Sheet';
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
            throw new Error(`Sheet named "${sheetName}" not found.`);
        }

        const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 'C4:L4' })[0] as string[];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 'A', range: 4 }) as any[];

        const results: StudentResult[] = [];

        for (const row of jsonData) {
            if (!row.A) continue; // Skip empty rows if roll number is missing

            const subjects: Subject[] = headers.map((name, index) => {
                const obtained = row[String.fromCharCode('C'.charCodeAt(0) + index)];
                return {
                    name: safeParseString(name),
                    fullMarks: 100,
                    passMarks: 40,
                    obtained: obtained === 'AB' ? 'AB' : safeParseNumber(obtained)
                };
            });

            const result: StudentResult = {
                rollNo: safeParseString(row.A),
                name: safeParseString(row.B),
                classId: config.classId,
                section: config.section,
                examType: config.examType,
                academicYear: config.academicYear,
                subjects,
                total: safeParseNumber(row.Q),
                maxMarks: safeParseNumber(row.R),
                percentage: safeParseNumber(row.S),
                grade: safeParseString(row.T),
                division: safeParseString(row.U),
                rank: safeParseNumber(row.V),
                remarks: safeParseString(row.W),
                published: false,
                updatedAt: new Date() as any, // This will be replaced by Firestore's serverTimestamp
            };
            results.push(result);
        }

        return results;

    } catch (error) {
        console.error('Error parsing Excel file:', error);
        throw new Error('Failed to parse Excel file. Check the file format and content.');
    }
};
