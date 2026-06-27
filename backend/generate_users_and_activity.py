import random
import uuid
import datetime
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, UserRole, Issue, Vote, VoteType, Comment, IssueStatus

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

INDIAN_FIRST_NAMES = [
    "Rahul", "Priya", "Amit", "Sneha", "Ravi", "Kavita", "Sanjay", "Anjali", "Vikas", "Pooja",
    "Arun", "Neha", "Sunil", "Aarti", "Manoj", "Swati", "Rajesh", "Kiran", "Suresh", "Ritu",
    "Anil", "Meena", "Vijay", "Anita", "Ramesh", "Sita", "Ashok", "Gita", "Dinesh", "Komal",
    "Tarun", "Divya", "Gaurav", "Nidhi", "Nitin", "Payal", "Mukesh", "Roshni", "Prakash", "Shruti",
    "Pramod", "Preeti", "Deepak", "Jyoti", "Naveen", "Shikha", "Alok", "Mamta", "Varun", "Sonali",
    "Narendra", "Yogi", "Mamata"
]

INDIAN_LAST_NAMES = [
    "Sharma", "Patel", "Singh", "Kumar", "Gupta", "Das", "Jain", "Verma", "Yadav", "Shah",
    "Reddy", "Rao", "Mishra", "Chauhan", "Bose", "Sen", "Nair", "Iyer", "Chakraborty", "Sinha"
]

def generate_users_and_activity():
    db = SessionLocal()
    
    print("Generating 50 new users...")
    
    users_data = []
    created_users = []
    
    # Generate 45 citizen users and 5 gov users
    for i in range(50):
        first_name = random.choice(INDIAN_FIRST_NAMES)
        last_name = random.choice(INDIAN_LAST_NAMES)
        name = f"{first_name} {last_name}"
        username_base = f"{first_name.lower()}.{last_name.lower()}{random.randint(10, 999)}"
        password = f"Pass@{random.randint(1000, 9999)}"
        
        if i < 5:
            # Gov user
            email = f"{username_base}.gov@gmail.com"
            role = UserRole.admin
        else:
            email = f"{username_base}@gmail.com"
            role = UserRole.citizen
            
        hashed_password = pwd_context.hash(password)
        
        user = User(
            id=uuid.uuid4(),
            name=name,
            email=email,
            password_hash=hashed_password,
            role=role,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(1, 60))
        )
        db.add(user)
        created_users.append(user)
        users_data.append({
            "Name": name,
            "Email": email,
            "Password": password,
            "Type": "Gov / Admin" if i < 5 else "Citizen"
        })
        
    db.commit()
    
    gov_users = created_users[:5]
    all_users = created_users
    
    print("Assigning activities...")
    issues = db.query(Issue).all()
    
    if not issues:
        print("No issues found to add activity to.")
        return
        
    # Generate random activity
    for issue in issues:
        # 1 to 15 random votes per issue
        num_votes = random.randint(1, 15)
        voters = random.sample(all_users, min(num_votes, len(all_users)))
        for voter in voters:
            vote = Vote(
                id=uuid.uuid4(),
                issue_id=issue.id,
                user_id=voter.id,
                type=VoteType.upvote
            )
            db.add(vote)
        issue.vote_count += len(voters)
        
        # 0 to 5 random comments
        num_comments = random.randint(0, 5)
        for _ in range(num_comments):
            commenter = random.choice(all_users)
            messages = [
                "I agree, this needs fixing.",
                "Yes, it has been like this for weeks.",
                "Please look into this ASAP.",
                "Thanks for reporting this.",
                "I saw this yesterday too.",
                "Very dangerous, needs attention.",
                "Can someone from the municipal corp fix this?"
            ]
            comment = Comment(
                id=uuid.uuid4(),
                issue_id=issue.id,
                user_id=commenter.id,
                body=random.choice(messages),
                created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=random.randint(1, 48))
            )
            db.add(comment)
            
    # Resolve exactly 10 issues
    issues_to_resolve = random.sample(issues, min(10, len(issues)))
    for issue in issues_to_resolve:
        resolver = random.choice(gov_users)
        issue.status = IssueStatus.resolved
        issue.assigned_to = resolver.id
        issue.updated_at = datetime.datetime.utcnow() - datetime.timedelta(hours=random.randint(1, 48))
        
        # Add authority comment
        comment = Comment(
            id=uuid.uuid4(),
            issue_id=issue.id,
            user_id=resolver.id,
            body="This issue has been reviewed and resolved by the respective authority.",
            is_authority_update=True,
            created_at=issue.updated_at
        )
        db.add(comment)
        
    db.commit()
    
    print("Writing credentials to credentials.md...")
    md_content = "# Generated User Credentials\n\n"
    md_content += "| Name | Email | Password | Type |\n"
    md_content += "|---|---|---|---|\n"
    for u in users_data:
        md_content += f"| {u['Name']} | {u['Email']} | {u['Password']} | {u['Type']} |\n"
        
    with open("credentials.md", "w", encoding="utf-8") as f:
        f.write(md_content)
        
    print("Done!")

if __name__ == "__main__":
    generate_users_and_activity()
