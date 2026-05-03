
import firebase_admin
from firebase_admin import credentials, firestore

def setup_firebase():
    # --- IMPORTANT --- 
    # Ensure your service account key file is named 'google-service-account.json'
    # and is located in the same directory as this script.
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate('google-service-account.json')
            firebase_admin.initialize_app(cred)
        return firestore.client()
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        print("Please ensure 'google-service-account.json' is in the correct path.")
        return None

def add_student_fees():
    db = setup_firebase()
    if not db:
        return

    # 1. Find the student document to get its unique ID
    student_name = "Nitin Kumar"
    student_roll = "2"
    student_class = "10"
    student_id = None

    try:
        users_ref = db.collection('users')
        # Query for the specific student
        query = users_ref.where('studentId', '==', student_roll).where('class', '==', student_class).limit(1)
        student_docs = list(query.stream())
        
        if not student_docs:
            print(f"Error: Student '{student_name}' (Roll: {student_roll}, Class: {student_class}) not found.")
            return
        
        student_id = student_docs[0].id
        print(f"Found student: {student_name} (ID: {student_id})")

    except Exception as e:
        print(f"Error querying for student: {e}")
        return

    # 2. Define the fee records to add
    academic_year = "2083-2084"
    fee_records = [
        {'feeType': 'Admission Fee', 'amount': 2000, 'status': 'paid', 'month': 'Baishak', 'paidDate': '2082-01-05', 'academicYear': academic_year},
        {'feeType': 'Monthly Tuition Fee', 'amount': 1500, 'status': 'paid', 'month': 'Baishak', 'paidDate': '2082-04-01', 'academicYear': academic_year},
        {'feeType': 'Monthly Tuition Fee', 'amount': 1500, 'status': 'paid', 'month': 'Jestha', 'paidDate': '2082-04-01', 'academicYear': academic_year},
        {'feeType': 'Monthly Tuition Fee', 'amount': 1500, 'status': 'paid', 'month': 'Ashad', 'paidDate': '2082-04-01', 'academicYear': academic_year},
        {'feeType': 'Monthly Tuition Fee', 'amount': 1500, 'status': 'paid', 'month': 'Shrawan', 'paidDate': '2082-04-01', 'academicYear': academic_year},
        {'feeType': 'Monthly Tuition Fee', 'amount': 1500, 'status': 'due', 'month': 'Bhadra', 'academicYear': academic_year},
        {'feeType': 'Monthly Tuition Fee', 'amount': 1500, 'status': 'due', 'month': 'Ashoj', 'academicYear': academic_year},
        {'feeType': 'Monthly Tuition Fee', 'amount': 1500, 'status': 'due', 'month': 'Kartik', 'academicYear': academic_year},
        {'feeType': 'Monthly Tuition Fee', 'amount': 1500, 'status': 'due', 'month': 'Mangsir', 'academicYear': academic_year},
        {'feeType': 'Monthly Tuition Fee', 'amount': 1500, 'status': 'due', 'month': 'Poush', 'academicYear': academic_year},
        {'feeType': 'Exam Fee - First Term', 'amount': 500, 'status': 'paid', 'month': 'Asoj', 'paidDate': '2082-06-10', 'academicYear': academic_year},
        {'feeType': 'Exam Fee - Second Term', 'amount': 500, 'status': 'due', 'month': 'Falgun', 'academicYear': academic_year},
        {'feeType': 'Diary Fee', 'amount': 150, 'status': 'paid', 'month': 'Baishak', 'paidDate': '2082-01-05', 'academicYear': academic_year},
        {'feeType': 'ID Card Fee', 'amount': 100, 'status': 'paid', 'month': 'Baishak', 'paidDate': '2082-01-05', 'academicYear': academic_year},
        {'feeType': 'Sports Fee', 'amount': 300, 'status': 'due', 'month': 'Bhadra', 'academicYear': academic_year},
        {'feeType': 'Computer Fee', 'amount': 800, 'status': 'due', 'month': 'Bhadra', 'academicYear': academic_year},
        {'feeType': 'Library Fee', 'amount': 200, 'status': 'paid', 'month': 'Baishak', 'paidDate': '2082-01-10', 'academicYear': academic_year}
    ]

    # 3. Create a batch write operation
    batch = db.batch()
    fees_ref = db.collection('studentFees')
    count = 0
    
    for record in fee_records:
        new_fee_ref = fees_ref.document()
        # Add the student's unique ID to the record before adding
        record['studentId'] = student_id
        batch.set(new_fee_ref, record)
        count += 1
    
    # 4. Commit the batch to Firestore
    try:
        batch.commit()
        print(f"Successfully added {count} sample fee records to Firestore for {student_name}.")
    except Exception as e:
        print(f"Error committing batch: {e}")

if __name__ == '__main__':
    add_student_fees()
