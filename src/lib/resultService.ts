import { collection, doc, writeBatch, getDocs, query, where, Timestamp, serverTimestamp, runTransaction, addDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { StudentResult, Subject, ExamConfig } from "../types/result";

const getResultsCollectionPath = (year: string, classId: string, examType: string) => `years/${year}/classes/${classId}/exams/${examType}/results`;

/**
 * Saves a batch of student results to Firestore and updates the exam configuration.
 */
export const saveResults = async (
    results: StudentResult[],
    examType: string,
    classId: string,
    year: string
): Promise<void> => {
    if (!results || results.length === 0) {
        throw new Error("No results to save.");
    }

    const batch = writeBatch(db);
    
    // 1. Set the results for each student
    const collectionPath = getResultsCollectionPath(year, `Class ${classId}`, examType);
    const resultsCollection = collection(db, collectionPath);
    results.forEach((result) => {
        const resultDoc = doc(resultsCollection, String(result.rollNo));
        const clean = Object.fromEntries(Object.entries(result).filter(([_, v]) => v !== undefined));
        batch.set(resultDoc, clean);
    });
    
    // 2. Create or update the exam configuration document
    const configDocId = `${examType}_${classId}_${year}`;
    const configDoc = doc(db, "examConfigs", configDocId);
    const examConfig: Partial<ExamConfig> = {
        examType,
        classId: `Class ${classId}`,
        academicYear: year,
        totalStudents: results.length,
        isPublished: false, 
        updatedAt: new Date() 
    };
    
    batch.set(configDoc, examConfig, { merge: true });

    try {
        await batch.commit();
    } catch (error) {
        if (error instanceof Error) {
            console.error("Firestore batch commit failed:", error.message);
            throw new Error(`Firestore error: ${error.message}`);
        } else {
            console.error("An unknown error occurred during batch commit:", error);
            throw new Error("An unknown error occurred while saving results.");
        }
    }
};

/**
 * Publishes all results for a given exam and sends a notification.
 */
export const publishResults = async (
    examType: string,
    classId: string,
    year: string
): Promise<void> => {
    try {
        const collectionPath = getResultsCollectionPath(year, classId, examType);
        const resultsCollection = collection(db, collectionPath);
        let studentCount = 0;

        // Use a transaction to ensure atomicity
        await runTransaction(db, async (transaction) => {
            // 1. Get all student documents in the collection
            const querySnapshot = await getDocs(resultsCollection);
            studentCount = querySnapshot.size;
            if (studentCount === 0) {
                throw new Error("No results found to publish.");
            }

            // 2. Update each student document to be published
            querySnapshot.forEach((doc) => {
                transaction.update(doc.ref, { 
                    isPublished: true, 
                    publishedAt: serverTimestamp() 
                });
            });

            // 3. Update the exam configuration to mark it as published
            const configDocId = `${examType}_${classId}_${year}`;
            const configDoc = doc(db, "examConfigs", configDocId);
            transaction.update(configDoc, { 
                isPublished: true, 
                publishedAt: serverTimestamp(),
                totalStudents: studentCount
            });
        });

        // 4. Send notification after the transaction is successful
        await sendResultNotification(classId, examType, year, studentCount);

    } catch (error) {
        console.error("Error publishing results:", error);
        throw new Error("Failed to publish results. Please ensure there are results saved as a draft first.");
    }
};

/**
 * Sends a notification to the notifications collection when results are published.
 */
export const sendResultNotification = async (
    classId: string,
    examType: string,
    year: string,
    studentCount: number
): Promise<void> => {
    try {
        const notificationsCollection = collection(db, 'notifications');
        await addDoc(notificationsCollection, {
            title: `Results Published: ${examType}`,
            message: `Results for class ${classId} have been published. ${studentCount} students can now view their results.`,
            classId,
            examType,
            year,
            studentCount,
            createdAt: serverTimestamp(),
            type: "result_published",
        });
    } catch (error) {
        console.error("Error sending notification:", error);
        // We don't re-throw the error, as this is a non-critical operation.
    }
};

/**
 * Fetches all published results for a student in a specific class across all years and exam types.
 */
export const getStudentResults = async (
    rollNo: string,
    classId: string,
    academicYears: string[], 
    examTypes: string[]
): Promise<StudentResult[]> => {
    try {
        const results: StudentResult[] = [];
        for (const year of academicYears) {
            for (const examType of examTypes) {
                const collectionPath = getResultsCollectionPath(year, classId, examType);
                const q = query(collection(db, collectionPath), where("isPublished", "==", true));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => {
                    results.push(doc.data() as StudentResult);
                });
            }
        }
        return results.filter(r => String(r.rollNo) === String(rollNo));
    } catch (error) {
        console.error("Error getting student results:", error);
        throw new Error("Failed to get student results.");
    }
};

/**
 * Fetches all results for a given class, exam, and year. For admin use.
 */
export const getClassResults = async (
    examType: string,
    classId: string,
    year: string
): Promise<StudentResult[]> => {
    try {
        const collectionPath = getResultsCollectionPath(year, classId, examType);
        const resultsCollection = collection(db, collectionPath);
        const q = query(resultsCollection, where("classId", "==", classId), where("isPublished", "==", true));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map((doc) => doc.data() as StudentResult);
    } catch (error) {
        console.error("Error getting class results:", error);
        throw new Error("Failed to get class results.");
    }
};

/**
 * Calculates the rank for each student based on their total marks.
 */
export const calculateRanks = (results: StudentResult[]): StudentResult[] => {
    const sorted = [...results].sort((a, b) => b.total - a.total);
    let rank = 1;
    return sorted.map((result, index) => {
        if (index > 0 && result.total < sorted[index - 1].total) {
            rank = index + 1;
        }
        return { ...result, rank };
    });
};

/**
 * Calculates the class average and topper marks for each subject.
 */
export const getClassAverageAndTopper = async (
    examType: string,
    classId: string,
    year: string
): Promise<{ [subject: string]: { average: number; topper: number } }> => {
    try {
        const classResults = await getClassResults(examType, classId, year);
        if (classResults.length === 0) return {};

        const subjectData: { [subject: string]: { total: number; count: number; topper: number } } = {};

        // Initialize with subjects from the first student
        classResults[0].subjects.forEach(s => {
            subjectData[s.name] = { total: 0, count: 0, topper: 0 };
        });

        classResults.forEach(student => {
            student.subjects.forEach(subject => {
                const marks = typeof subject.obtained === 'number' ? subject.obtained : 0;
                if(subjectData[subject.name]){
                    subjectData[subject.name].total += marks;
                    subjectData[subject.name].count++;
                    if (marks > subjectData[subject.name].topper) {
                        subjectData[subject.name].topper = marks;
                    }
                }
            });
        });

        const finalData: { [subject: string]: { average: number; topper: number } } = {};
        for (const subjectName in subjectData) {
            finalData[subjectName] = {
                average: subjectData[subjectName].total / subjectData[subject.name].count,
                topper: subjectData[subjectName].topper,
            };
        }

        return finalData;
    } catch (error) {
        console.error("Error calculating class average and topper:", error);
        throw new Error("Failed to calculate class statistics.");
    }
};
