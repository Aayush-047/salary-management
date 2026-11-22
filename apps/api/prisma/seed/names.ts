/** Common first and last names per country, used to generate plausible employee names. */
// prettier-ignore
export const NAMES: Readonly<Record<string, { first: readonly string[]; last: readonly string[] }>> =
  {
    US: {
      first: ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Christopher", "Karen", "Daniel", "Emily", "Matthew", "Ashley", "Anthony", "Michelle", "Mark", "Amanda", "Andrew", "Melissa"],
      last: ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"],
    },
    GB: {
      first: ["Oliver", "Amelia", "George", "Isla", "Harry", "Ava", "Jack", "Mia", "Jacob", "Ivy", "Noah", "Lily", "Charlie", "Isabella", "Muhammad", "Rosie", "Thomas", "Sophia", "Oscar", "Grace", "William", "Freya", "James", "Florence", "Leo", "Emily", "Alfie", "Poppy", "Henry", "Evie"],
      last: ["Smith", "Jones", "Taylor", "Brown", "Williams", "Wilson", "Johnson", "Davies", "Patel", "Robinson", "Wright", "Thompson", "Evans", "Walker", "White", "Roberts", "Green", "Hall", "Thomas", "Clarke", "Jackson", "Wood", "Harris", "Edwards", "Turner", "Martin", "Cooper", "Hill", "Ward", "Hughes"],
    },
    DE: {
      first: ["Lukas", "Anna", "Leon", "Mia", "Finn", "Emma", "Jonas", "Hannah", "Paul", "Lena", "Felix", "Lea", "Maximilian", "Marie", "Elias", "Sophie", "Ben", "Laura", "Noah", "Julia", "Tim", "Lisa", "Jan", "Sarah", "Niklas", "Katharina", "Tobias", "Johanna", "Moritz", "Clara"],
      last: ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Schäfer", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schröder", "Neumann", "Schwarz", "Zimmermann", "Braun", "Krüger", "Hofmann", "Hartmann", "Lange", "Schmitt", "Werner", "Krause", "Meier", "Lehmann"],
    },
    IN: {
      first: ["Aarav", "Ananya", "Vihaan", "Diya", "Arjun", "Aadhya", "Vivaan", "Saanvi", "Aditya", "Isha", "Rohan", "Priya", "Karan", "Kavya", "Rahul", "Neha", "Siddharth", "Pooja", "Aryan", "Riya", "Vikram", "Sneha", "Rajesh", "Anjali", "Amit", "Divya", "Nikhil", "Meera", "Sanjay", "Lakshmi"],
      last: ["Sharma", "Patel", "Singh", "Kumar", "Gupta", "Reddy", "Iyer", "Nair", "Rao", "Mehta", "Joshi", "Desai", "Agarwal", "Verma", "Mishra", "Chatterjee", "Banerjee", "Pillai", "Menon", "Kapoor", "Malhotra", "Bhat", "Kulkarni", "Shetty", "Pandey", "Saxena", "Chopra", "Das", "Ghosh", "Yadav"],
    },
    BR: {
      first: ["Miguel", "Helena", "Arthur", "Alice", "Gael", "Laura", "Heitor", "Maria", "Théo", "Valentina", "Davi", "Sophia", "Gabriel", "Isabella", "Bernardo", "Manuela", "Samuel", "Júlia", "João", "Beatriz", "Pedro", "Luiza", "Lucas", "Mariana", "Rafael", "Lívia", "Matheus", "Camila", "Felipe", "Larissa"],
      last: ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa", "Rocha", "Dias", "Nascimento", "Andrade", "Moreira", "Nunes", "Marques", "Machado", "Mendes", "Freitas"],
    },
    JP: {
      first: ["Haruto", "Yui", "Sota", "Hina", "Yuto", "Aoi", "Riku", "Mei", "Haruki", "Sakura", "Ren", "Yuna", "Kaito", "Rin", "Takumi", "Akari", "Daiki", "Misaki", "Kenta", "Nanami", "Shota", "Ayaka", "Yuki", "Haruka", "Kenji", "Emi", "Hiroshi", "Keiko", "Takeshi", "Naomi"],
      last: ["Sato", "Suzuki", "Takahashi", "Tanaka", "Watanabe", "Ito", "Yamamoto", "Nakamura", "Kobayashi", "Kato", "Yoshida", "Yamada", "Sasaki", "Yamaguchi", "Matsumoto", "Inoue", "Kimura", "Hayashi", "Shimizu", "Yamazaki", "Mori", "Abe", "Ikeda", "Hashimoto", "Yamashita", "Ishikawa", "Nakajima", "Maeda", "Fujita", "Ogawa"],
    },
    SG: {
      first: ["Wei", "Jia", "Ming", "Xin", "Jun", "Ling", "Hao", "Mei", "Kai", "Yan", "Zhi", "Siti", "Nur", "Ahmad", "Farah", "Hafiz", "Aisyah", "Rizwan", "Priya", "Arun", "Deepa", "Ravi", "Kavitha", "Suresh", "Ethan", "Chloe", "Ryan", "Rachel", "Marcus", "Vanessa"],
      last: ["Tan", "Lim", "Lee", "Ng", "Ong", "Wong", "Goh", "Chua", "Chan", "Koh", "Teo", "Ang", "Yeo", "Tay", "Ho", "Low", "Toh", "Sim", "Chong", "Chia", "Abdullah", "Rahman", "Ismail", "Hassan", "Kumar", "Pillai", "Nair", "Raj", "Fernandez", "Wee"],
    },
  };
