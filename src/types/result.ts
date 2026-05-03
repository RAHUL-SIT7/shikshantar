import { Timestamp } from 'firebase/firestore';

export interface Subject {
    name: string;
    fullMarks: number;
    passMarks: number;
    obtained: number | "AB";
}

export interface StudentResult {
    rollNo: string;
    name: string;
    classId: string;
    section: string;
    examType: string;
    academicYear: string;
    subjects: Subject[];
    total: number;
    maxMarks: number;
    percentage: number;
    grade: string;
    division: string;
    rank: number;
    remarks: string;
    published: boolean;
    publishedAt?: Timestamp;
    updatedAt: Timestamp;
}

export interface ExamConfig {
    examType: string;
    classId: string;
    section: string;
    academicYear: string;
    totalStudents: number;
    publishedAt?: Timestamp;
    isPublished: boolean;
}
