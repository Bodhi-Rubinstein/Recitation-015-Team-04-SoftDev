# CSCI 3308 Group 4 - Team PowerPlay

## Mission Statement
Power Play is a web-based sports trading card game where users collect, trade, and battle using digital cards based on real NBA and WNBA athletes. Each card includes real-world performance statistics—such as points, assists, and rebounds—that directly influence gameplay mechanics like attack, defense, and health. Players build custom decks of five cards and compete in round-based matches, with outcomes determined by a combination of strategy, deck strength, and optional dice rolls. The game blends sports fandom with tactical gameplay and RPG-style progression.


ProjectSourceCode/  
├── src/  
│   ├── views/             # Handlebars templates for UI pages  
│   ├── resources/         # Static assets (CSS, JavaScript, images)  
│   ├── init_data/         # SQL scripts to initialize the database  
│   └── index.js           # Main application server logic  
│   └── populate_db.js     # Populate DB
├── test/                  # Unit and integration tests  
├── docker-compose.yaml    # Docker configuration for container orchestration  
├── package.json           # Node.js project metadata and dependencies  
└── .gitignore             # Specifies files and directories to be ignored by Git  



How to run:  
Clone the repository  
Navigate to ProjectSourceCode  
Ensure Docker is installed on your machine  
Start up the program using docker compose up --build  
Access the website at localhost:3000 or online at https://recitation-015-team-04-softdev.onrender.com/
