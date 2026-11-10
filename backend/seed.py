from app import create_app
from app.extensions import db
from app.models.skill import SkillCategory

app = create_app()

def run_seed():
    """Cleanly initializes the database schema without any mock students or fake data."""
    with app.app_context():
        print("Cleaning up database tables...")
        db.drop_all()
        db.create_all()

        print("Setting up initial skill categories...")
        categories_data = [
            {"name": "Programming & Development", "description": "Software, web, mobile, and system programming", "icon_name": "Code"},
            {"name": "Design & UI/UX", "description": "User interface, product design, wireframing, and Figma", "icon_name": "Palette"},
            {"name": "Media & Production", "description": "Video editing, motion graphics, audio, and photography", "icon_name": "Video"},
            {"name": "Academics & Sciences", "description": "Mathematics, statistics, physics, and coursework", "icon_name": "BookOpen"},
            {"name": "Soft Skills & Communication", "description": "Public speaking, debate, interview prep, and leadership", "icon_name": "Users"}
        ]
        for c in categories_data:
            cat = SkillCategory(name=c["name"], description=c["description"], icon_name=c["icon_name"])
            db.session.add(cat)

        db.session.commit()
        print("Clean database initialized successfully. No mock students or fake listings created.")

if __name__ == "__main__":
    run_seed()
