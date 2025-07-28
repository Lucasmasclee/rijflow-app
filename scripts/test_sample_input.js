const fs = require('fs');
const path = require('path');

// Test the generated sample_input.json file
const generatedFilePath = path.join(__dirname, '..', 'src', 'app', 'dashboard', 'ai-schedule', 'generated', 'sample_input.json');

console.log('Testing generated sample_input.json file...');
console.log('File path:', generatedFilePath);

try {
  // Check if file exists
  if (!fs.existsSync(generatedFilePath)) {
    console.log('❌ Generated file does not exist yet. Please run the AI schedule page first.');
    process.exit(1);
  }

  // Read and parse the file
  const fileContent = fs.readFileSync(generatedFilePath, 'utf8');
  const data = JSON.parse(fileContent);

  console.log('✅ File exists and is valid JSON');

  // Validate structure
  const requiredInstructorFields = ['beschikbareUren', 'datums', 'blokuren', 'pauzeTussenLessen', 'langePauzeDuur', 'locatiesKoppelen'];
  const requiredStudentFields = ['id', 'naam', 'lessenPerWeek', 'lesDuur', 'beschikbaarheid'];

  // Check instructor structure
  if (!data.instructeur) {
    console.log('❌ Missing instructeur object');
    process.exit(1);
  }

  for (const field of requiredInstructorFields) {
    if (!(field in data.instructeur)) {
      console.log(`❌ Missing instructor field: ${field}`);
      process.exit(1);
    }
  }

  console.log('✅ Instructor structure is valid');

  // Check students structure
  if (!Array.isArray(data.leerlingen)) {
    console.log('❌ leerlingen should be an array');
    process.exit(1);
  }

  for (const student of data.leerlingen) {
    for (const field of requiredStudentFields) {
      if (!(field in student)) {
        console.log(`❌ Missing student field: ${field}`);
        process.exit(1);
      }
    }
  }

  console.log('✅ Students structure is valid');

  // Print summary
  console.log('\n📊 Summary:');
  console.log(`- Instructor availability days: ${Object.keys(data.instructeur.beschikbareUren).length}`);
  console.log(`- Week dates: ${data.instructeur.datums.length} dates`);
  console.log(`- Students: ${data.leerlingen.length} students`);
  console.log(`- Block hours enabled: ${data.instructeur.blokuren}`);
  console.log(`- Pause between lessons: ${data.instructeur.pauzeTussenLessen} minutes`);
  console.log(`- Long pause duration: ${data.instructeur.langePauzeDuur} minutes`);

  // Test with generate_week_planning.js
  console.log('\n🧪 Testing with generate_week_planning.js...');
  
  const { execSync } = require('child_process');
  try {
    const result = execSync(`node scripts/generate_week_planning.js "${generatedFilePath}"`, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('✅ generate_week_planning.js executed successfully');
    console.log('Output length:', result.length, 'characters');
  } catch (error) {
    console.log('❌ generate_week_planning.js failed:', error.message);
  }

} catch (error) {
  console.log('❌ Error reading or parsing file:', error.message);
  process.exit(1);
} 