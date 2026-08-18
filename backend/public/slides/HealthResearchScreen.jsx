// ============================================
// HEALTH RESEARCH SCREEN
// Comprehensive disease & health encyclopedia
// 8 featured + 12 searchable background categories
// ============================================

window.HealthResearchScreen = () => {
    const { useState } = React;
    const { navigateTo, showNotification } = window.useApp();
    const Icons = window.Icons;

    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [showAllCategories, setShowAllCategories] = useState(false);

    // ── FEATURED Categories (shown on main grid) ──
    const featuredCategories = [
        {
            id: 'diabetes', name: 'Diabetes', emoji: '🩸', color: '#E53935', featured: true,
            gradient: 'linear-gradient(135deg, #FFEBEE, #FFCDD2)',
            tagline: 'Blood Sugar Management',
            description: 'Diabetes is a chronic condition where the body cannot properly process blood glucose. Type 2 diabetes is the most common, affecting how your body uses insulin.',
            symptoms: ['Frequent urination', 'Excessive thirst', 'Unexplained weight loss', 'Blurred vision', 'Slow wound healing', 'Fatigue'],
            medicines: [
                { name: 'Metformin 500mg', type: 'Oral', usage: 'First-line treatment, reduces glucose production in liver', dosage: 'Twice daily with meals', price: '₹35' },
                { name: 'Glimepiride 1mg', type: 'Oral', usage: 'Stimulates pancreatic insulin secretion', dosage: 'Once before breakfast', price: '₹50' },
                { name: 'Januvia 100mg', type: 'Oral', usage: 'DPP-4 inhibitor, lowers blood sugar after meals', dosage: 'Once daily', price: '₹220' },
                { name: 'Insulin Glargine', type: 'Injectable', usage: 'Long-acting insulin for basal coverage', dosage: 'Once daily at bedtime', price: '₹450' },
            ],
            dailyTips: ['Monitor blood sugar before and after meals', 'Walk 30 minutes after eating', 'Avoid sugary drinks and refined carbs', 'Keep HbA1c below 7%', 'Regular eye and foot checkups'],
            prevention: ['Maintain a healthy BMI', 'Exercise 150 min/week', 'High-fiber diet', 'Limit processed foods', 'Regular health screening after 35']
        },
        {
            id: 'digestive', name: 'Digestive Care', emoji: '🫃', color: '#7B1FA2', featured: true,
            gradient: 'linear-gradient(135deg, #F3E5F5, #E1BEE7)',
            tagline: 'Gut Health & Digestion',
            description: 'Digestive issues include acid reflux, IBS, constipation, and gastritis. A healthy gut is essential for nutrient absorption and immune function.',
            symptoms: ['Bloating & gas', 'Heartburn / acid reflux', 'Constipation or diarrhea', 'Stomach cramps', 'Nausea', 'Loss of appetite'],
            medicines: [
                { name: 'Pantoprazole 40mg', type: 'Oral', usage: 'Proton pump inhibitor, reduces stomach acid', dosage: 'Once before breakfast', price: '₹42' },
                { name: 'Domperidone 10mg', type: 'Oral', usage: 'Improves gut motility, reduces nausea', dosage: 'Before meals, thrice daily', price: '₹30' },
                { name: 'Gelusil MPS', type: 'Oral', usage: 'Antacid for quick acidity relief', dosage: 'After meals as needed', price: '₹65' },
                { name: 'Isabgol (Psyllium Husk)', type: 'Fiber', usage: 'Natural fiber for constipation relief', dosage: '2 tsp with water at bedtime', price: '₹80' },
            ],
            dailyTips: ['Eat slowly and chew food thoroughly', 'Drink warm water in the morning', 'Include probiotics (curd/yogurt) daily', 'Avoid spicy and oily food at night', 'Eat dinner 3 hours before sleep'],
            prevention: ['High-fiber diet with whole grains', 'Stay hydrated (2-3L water/day)', 'Regular meal timings', 'Manage stress levels', 'Avoid excessive caffeine']
        },
        {
            id: 'heart', name: 'Heart Care', emoji: '❤️', color: '#C62828', featured: true,
            gradient: 'linear-gradient(135deg, #FFEBEE, #EF9A9A)',
            tagline: 'Cardiovascular Health',
            description: 'Heart disease is the leading cause of death globally. Managing blood pressure, cholesterol, and lifestyle factors is crucial for heart health.',
            symptoms: ['Chest pain or tightness', 'Shortness of breath', 'Irregular heartbeat', 'Swelling in legs', 'Dizziness', 'Fatigue during physical activity'],
            medicines: [
                { name: 'Aspirin 75mg', type: 'Oral', usage: 'Blood thinner, prevents clot formation', dosage: 'Once daily after food', price: '₹15' },
                { name: 'Atorvastatin 10mg', type: 'Oral', usage: 'Statin, lowers LDL cholesterol', dosage: 'Once daily at night', price: '₹55' },
                { name: 'Amlodipine 5mg', type: 'Oral', usage: 'Calcium channel blocker for BP', dosage: 'Once daily', price: '₹45' },
                { name: 'Clopidogrel 75mg', type: 'Oral', usage: 'Antiplatelet, prevents heart attack/stroke', dosage: 'Once daily', price: '₹65' },
            ],
            dailyTips: ['Walk 30 min daily for heart health', 'Reduce salt intake to < 5g/day', 'Monitor blood pressure regularly', 'Include omega-3 (fish/flaxseed)', 'Manage stress with meditation'],
            prevention: ['No smoking', 'Limit alcohol intake', 'Maintain healthy weight', 'Regular cholesterol checks', 'Control blood pressure and sugar']
        },
        {
            id: 'respiratory', name: 'Respiratory Care', emoji: '🫁', color: '#0277BD', featured: true,
            gradient: 'linear-gradient(135deg, #E1F5FE, #B3E5FC)',
            tagline: 'Breathing & Lung Health',
            description: 'Respiratory conditions include asthma, COPD, bronchitis, and allergic rhinitis. Clean air, proper breathing, and medication help manage symptoms.',
            symptoms: ['Wheezing', 'Persistent cough', 'Chest tightness', 'Difficulty breathing', 'Mucus production', 'Breathlessness on exertion'],
            medicines: [
                { name: 'Salbutamol Inhaler', type: 'Inhaler', usage: 'Quick relief bronchodilator for asthma', dosage: '2 puffs as needed', price: '₹120' },
                { name: 'Montelukast 10mg', type: 'Oral', usage: 'Leukotriene blocker for asthma/allergies', dosage: 'Once daily at night', price: '₹85' },
                { name: 'Budesonide Inhaler', type: 'Inhaler', usage: 'Corticosteroid for long-term asthma control', dosage: 'Twice daily', price: '₹250' },
                { name: 'Ambroxol 30mg', type: 'Oral', usage: 'Mucolytic, thins mucus in airways', dosage: 'Twice daily', price: '₹35' },
            ],
            dailyTips: ['Practice deep breathing exercises daily', 'Use an air purifier at home', 'Avoid smoking and polluted areas', 'Keep rescue inhaler accessible', 'Steam inhalation for congestion'],
            prevention: ['No smoking or passive smoking', 'Annual flu vaccination', 'Use masks in polluted areas', 'Regular exercise for lung capacity', 'Keep home dust-free']
        },
        {
            id: 'kidney', name: 'Kidney Care', emoji: '🫘', color: '#AD1457', featured: true,
            gradient: 'linear-gradient(135deg, #FCE4EC, #F8BBD0)',
            tagline: 'Renal Health & Detox',
            description: 'Kidneys filter waste, balance electrolytes, and regulate blood pressure. Chronic kidney disease often develops silently and requires early detection.',
            symptoms: ['Reduced urine output', 'Swelling in ankles/feet', 'Persistent fatigue', 'Loss of appetite', 'Nausea', 'High blood pressure'],
            medicines: [
                { name: 'Telmisartan 40mg', type: 'Oral', usage: 'Protects kidneys, controls BP', dosage: 'Once daily', price: '₹65' },
                { name: 'Furosemide 40mg', type: 'Oral', usage: 'Diuretic, reduces fluid retention', dosage: 'Once daily morning', price: '₹25' },
                { name: 'Sodium Bicarbonate', type: 'Oral', usage: 'Corrects metabolic acidosis', dosage: 'As prescribed', price: '₹20' },
                { name: 'Erythropoietin', type: 'Injectable', usage: 'Treats anemia from kidney disease', dosage: 'As prescribed', price: '₹800' },
            ],
            dailyTips: ['Drink 2-3L water daily for kidney flushing', 'Limit salt and protein in diet', 'Monitor urine color (pale yellow = good)', 'Avoid NSAIDs overuse', 'Regular creatinine and eGFR tests'],
            prevention: ['Stay well hydrated', 'Control blood pressure and diabetes', 'Avoid excessive painkillers', 'Limit salt and processed food', 'Annual kidney function tests after 40']
        },
        {
            id: 'joints', name: 'Joints & Muscle', emoji: '🦴', color: '#E65100', featured: true,
            gradient: 'linear-gradient(135deg, #FFF3E0, #FFE0B2)',
            tagline: 'Bone & Joint Health',
            description: 'Joint and muscle conditions include arthritis, osteoporosis, and muscular pain. Maintaining bone density and joint flexibility is key to mobility.',
            symptoms: ['Joint pain & stiffness', 'Swelling around joints', 'Reduced range of motion', 'Muscle cramps', 'Back pain', 'Weakness in limbs'],
            medicines: [
                { name: 'Diclofenac 50mg', type: 'Oral', usage: 'Anti-inflammatory for joint/muscle pain', dosage: 'Twice daily after food', price: '₹25' },
                { name: 'Calcium + Vitamin D3', type: 'Oral', usage: 'Bone health supplement', dosage: 'Once daily after lunch', price: '₹95' },
                { name: 'Glucosamine 500mg', type: 'Oral', usage: 'Joint cartilage repair supplement', dosage: 'Twice daily', price: '₹120' },
                { name: 'Flexon MR', type: 'Oral', usage: 'Muscle relaxant with pain relief', dosage: 'Twice daily after food', price: '₹55' },
            ],
            dailyTips: ['Stretch for 10 min every morning', 'Include calcium-rich foods', 'Get 15 min of sunlight for Vitamin D', 'Maintain healthy body weight', 'Avoid sitting in one position too long'],
            prevention: ['Weight-bearing exercise', 'Calcium and Vitamin D supplementation', 'Ergonomic workspace setup', 'Strength training 2-3x/week', 'Regular bone density scans after 50']
        },
        {
            id: 'hair', name: 'Hair Care', emoji: '💇', color: '#6A1B9A', featured: true,
            gradient: 'linear-gradient(135deg, #F3E5F5, #CE93D8)',
            tagline: 'Hair Health & Growth',
            description: 'Hair loss and thinning can result from nutritional deficiencies, stress, hormonal changes, or genetic factors.',
            symptoms: ['Excessive hair fall', 'Thinning hair', 'Dry & brittle hair', 'Dandruff & flaky scalp', 'Premature greying', 'Receding hairline'],
            medicines: [
                { name: 'Biotin 10000mcg', type: 'Oral', usage: 'Strengthens hair and nails', dosage: 'Once daily with food', price: '₹250' },
                { name: 'Minoxidil 5%', type: 'Topical', usage: 'Promotes hair regrowth', dosage: 'Apply twice daily on scalp', price: '₹450' },
                { name: 'Finasteride 1mg', type: 'Oral', usage: 'Reduces hair loss in men', dosage: 'Once daily', price: '₹180' },
                { name: 'Iron + Folic Acid', type: 'Oral', usage: 'Corrects iron deficiency causing hair loss', dosage: 'Once daily', price: '₹60' },
            ],
            dailyTips: ['Use mild sulfate-free shampoo', 'Oil massage scalp 2x/week', 'Eat protein-rich foods', 'Avoid excessive heat styling', 'Stay hydrated — drink 3L water daily'],
            prevention: ['Balanced diet with iron, zinc, biotin', 'Manage stress levels', 'Avoid tight hairstyles', 'Protect hair from sun and pollution', 'Regular scalp care and trims']
        },
        {
            id: 'vitamins', name: 'Vitamins', emoji: '🧬', color: '#F57F17', featured: true,
            gradient: 'linear-gradient(135deg, #FFFDE7, #FFF9C4)',
            tagline: 'Essential Nutrients',
            description: 'Vitamins and supplements fill nutritional gaps in your diet. Deficiencies can lead to fatigue, weak immunity, and chronic health issues.',
            symptoms: ['Chronic fatigue', 'Weak immunity', 'Muscle weakness', 'Poor wound healing', 'Mood changes & irritability', 'Bone pain'],
            medicines: [
                { name: 'Vitamin D3 60000 IU', type: 'Oral', usage: 'Corrects Vitamin D deficiency', dosage: 'Once weekly for 8 weeks', price: '₹120' },
                { name: 'Vitamin B12 1500mcg', type: 'Oral', usage: 'Energy, nerve health, red blood cells', dosage: 'Once daily', price: '₹180' },
                { name: 'Omega-3 Fish Oil', type: 'Oral', usage: 'Heart, brain, and joint health', dosage: 'Once daily with food', price: '₹350' },
                { name: 'Multivitamin (A-Z)', type: 'Oral', usage: 'Complete daily vitamin coverage', dosage: 'Once daily after breakfast', price: '₹200' },
            ],
            dailyTips: ['Get 15 min sunlight for Vitamin D', 'Eat colorful fruits and vegetables', 'Include nuts, seeds, whole grains', 'Consider B12 if vegetarian/vegan', 'Get blood tests every 6 months'],
            prevention: ['Balanced diet with all food groups', 'Regular health check-ups', 'Avoid excessive processed foods', 'Sun exposure for Vitamin D', 'Consult doctor before supplements']
        },
    ];

    // ── SEARCHABLE Background Categories (not shown on grid, only found via search) ──
    const backgroundCategories = [
        {
            id: 'fever', name: 'Fever & Cold', emoji: '🤒', color: '#FF5722',
            gradient: 'linear-gradient(135deg, #FBE9E7, #FFCCBC)',
            tagline: 'Common Fever & Flu',
            description: 'Fever is a temporary increase in body temperature, often due to infections. Common cold and flu are viral infections affecting the upper respiratory tract.',
            symptoms: ['High temperature (>100.4°F)', 'Chills & shivering', 'Body aches', 'Headache', 'Runny nose & sneezing', 'Sore throat'],
            medicines: [
                { name: 'Paracetamol 500mg', type: 'Oral', usage: 'Reduces fever and mild pain', dosage: 'Every 4-6 hours as needed', price: '₹10' },
                { name: 'Cetirizine 10mg', type: 'Oral', usage: 'Antihistamine for cold symptoms', dosage: 'Once daily at night', price: '₹12' },
                { name: 'Azithromycin 500mg', type: 'Oral', usage: 'Antibiotic for bacterial infections', dosage: 'Once daily for 3 days', price: '₹70' },
                { name: 'Cough Syrup (Benadryl)', type: 'Oral', usage: 'Suppresses cough reflex', dosage: '10ml thrice daily', price: '₹85' },
            ],
            dailyTips: ['Rest and sleep adequately', 'Drink warm fluids (soup, tea)', 'Gargle with warm salt water', 'Use steam inhalation', 'Avoid cold beverages'],
            prevention: ['Wash hands frequently', 'Stay away from sick people', 'Get annual flu vaccination', 'Boost immunity with fruits', 'Keep warm in cold weather']
        },
        {
            id: 'skin', name: 'Skin Care', emoji: '🧴', color: '#FF8A65',
            gradient: 'linear-gradient(135deg, #FFF3E0, #FFE0B2)',
            tagline: 'Dermatology & Skin Health',
            description: 'Skin conditions range from acne and eczema to fungal infections and psoriasis. Proper skincare, hydration, and sun protection are essential.',
            symptoms: ['Acne & pimples', 'Dry or oily skin', 'Itching & redness', 'Rashes & hives', 'Dark spots & pigmentation', 'Fungal infections'],
            medicines: [
                { name: 'Clindamycin Gel', type: 'Topical', usage: 'Antibiotic for acne', dosage: 'Apply twice daily on affected area', price: '₹120' },
                { name: 'Ketoconazole Cream', type: 'Topical', usage: 'Antifungal for ringworm/infections', dosage: 'Apply twice daily', price: '₹85' },
                { name: 'Hydrocortisone 1%', type: 'Topical', usage: 'Reduces inflammation and itching', dosage: 'Apply thin layer twice daily', price: '₹45' },
                { name: 'Adapalene Gel', type: 'Topical', usage: 'Retinoid for acne and anti-aging', dosage: 'Apply at night', price: '₹250' },
            ],
            dailyTips: ['Apply sunscreen SPF 30+ daily', 'Cleanse face twice daily', 'Moisturize after washing', 'Drink plenty of water', 'Change pillowcase weekly'],
            prevention: ['Use sunscreen even on cloudy days', 'Avoid touching face frequently', 'Remove makeup before sleep', 'Eat fruits rich in Vitamin C', 'Manage stress levels']
        },
        {
            id: 'eye', name: 'Eye Care', emoji: '👁️', color: '#1565C0',
            gradient: 'linear-gradient(135deg, #E3F2FD, #BBDEFB)',
            tagline: 'Vision & Eye Health',
            description: 'Eye conditions include myopia, dry eyes, glaucoma, and cataracts. Regular eye exams and screen-time management are vital for good vision.',
            symptoms: ['Blurred vision', 'Eye strain & headaches', 'Dry or watery eyes', 'Redness & irritation', 'Floaters', 'Sensitivity to light'],
            medicines: [
                { name: 'Refresh Tears', type: 'Eye Drops', usage: 'Lubricant for dry eyes', dosage: '1-2 drops 3-4 times daily', price: '₹120' },
                { name: 'Ofloxacin Eye Drops', type: 'Eye Drops', usage: 'Antibiotic for eye infections', dosage: '1 drop every 4 hours', price: '₹65' },
                { name: 'Timolol 0.5%', type: 'Eye Drops', usage: 'Reduces eye pressure (glaucoma)', dosage: '1 drop twice daily', price: '₹80' },
                { name: 'Lutein + Zeaxanthin', type: 'Oral', usage: 'Eye health supplement', dosage: 'Once daily', price: '₹220' },
            ],
            dailyTips: ['Follow 20-20-20 rule for screens', 'Blink frequently when using devices', 'Wear sunglasses outdoors', 'Eat carrots and leafy greens', 'Get adequate sleep'],
            prevention: ['Annual eye check-ups', 'Limit screen time', 'Use anti-glare glasses', 'Eat omega-3 rich foods', 'Avoid rubbing eyes']
        },
        {
            id: 'mental', name: 'Mental Health', emoji: '🧠', color: '#5C6BC0',
            gradient: 'linear-gradient(135deg, #E8EAF6, #C5CAE9)',
            tagline: 'Mind & Emotional Wellness',
            description: 'Mental health includes anxiety, depression, stress, and sleep disorders. Mental well-being is as important as physical health for overall quality of life.',
            symptoms: ['Persistent sadness', 'Anxiety & panic attacks', 'Sleep problems', 'Loss of interest in activities', 'Difficulty concentrating', 'Social withdrawal'],
            medicines: [
                { name: 'Escitalopram 10mg', type: 'Oral', usage: 'SSRI antidepressant', dosage: 'Once daily', price: '₹85' },
                { name: 'Alprazolam 0.25mg', type: 'Oral', usage: 'Anti-anxiety (short-term use only)', dosage: 'As prescribed', price: '₹30' },
                { name: 'Melatonin 3mg', type: 'Oral', usage: 'Natural sleep aid', dosage: 'Once before bed', price: '₹150' },
                { name: 'Ashwagandha', type: 'Oral', usage: 'Herbal adaptogen for stress', dosage: 'Twice daily', price: '₹200' },
            ],
            dailyTips: ['Practice meditation 10 min daily', 'Maintain a gratitude journal', 'Exercise regularly for endorphins', 'Talk to someone you trust', 'Limit social media usage'],
            prevention: ['Build strong social connections', 'Regular physical activity', 'Adequate sleep (7-8 hrs)', 'Learn stress management techniques', 'Seek professional help when needed']
        },
        {
            id: 'liver', name: 'Liver Care', emoji: '🫁', color: '#4E342E',
            gradient: 'linear-gradient(135deg, #EFEBE9, #D7CCC8)',
            tagline: 'Liver Health & Detox',
            description: 'The liver is essential for detoxification, metabolism, and bile production. Fatty liver disease, hepatitis, and cirrhosis are common liver conditions.',
            symptoms: ['Abdominal pain (upper right)', 'Jaundice (yellow skin/eyes)', 'Fatigue', 'Dark urine', 'Swollen abdomen', 'Loss of appetite'],
            medicines: [
                { name: 'Ursodeoxycholic Acid', type: 'Oral', usage: 'Dissolves gallstones, treats liver disease', dosage: 'Twice daily', price: '₹150' },
                { name: 'Silymarin (Milk Thistle)', type: 'Oral', usage: 'Liver protector and antioxidant', dosage: 'Twice daily', price: '₹180' },
                { name: 'Liv 52', type: 'Oral', usage: 'Ayurvedic liver tonic', dosage: '2 tablets twice daily', price: '₹120' },
                { name: 'Lactulose Syrup', type: 'Oral', usage: 'Treats hepatic encephalopathy', dosage: '15-30ml daily', price: '₹90' },
            ],
            dailyTips: ['Avoid alcohol consumption', 'Eat a balanced low-fat diet', 'Stay hydrated', 'Avoid self-medication (reduces liver load)', 'Include turmeric and garlic in food'],
            prevention: ['Limit alcohol intake', 'Maintain healthy weight', 'Get Hepatitis B vaccine', 'Avoid sharing needles', 'Regular liver function tests']
        },
        {
            id: 'thyroid', name: 'Thyroid Care', emoji: '🦋', color: '#00838F',
            gradient: 'linear-gradient(135deg, #E0F7FA, #B2EBF2)',
            tagline: 'Thyroid & Hormonal Balance',
            description: 'The thyroid gland controls metabolism, energy, and body temperature. Hypothyroidism (underactive) and hyperthyroidism (overactive) are common thyroid disorders.',
            symptoms: ['Unexplained weight changes', 'Fatigue or hyperactivity', 'Hair loss', 'Sensitivity to cold/heat', 'Dry skin', 'Mood swings'],
            medicines: [
                { name: 'Levothyroxine 50mcg', type: 'Oral', usage: 'Thyroid hormone replacement', dosage: 'Once daily on empty stomach', price: '₹30' },
                { name: 'Carbimazole 10mg', type: 'Oral', usage: 'Reduces thyroid hormone production', dosage: 'As prescribed', price: '₹45' },
                { name: 'Selenium 200mcg', type: 'Oral', usage: 'Supports thyroid function', dosage: 'Once daily', price: '₹180' },
                { name: 'Iodine Supplement', type: 'Oral', usage: 'Prevents iodine deficiency goiter', dosage: 'Once daily', price: '₹60' },
            ],
            dailyTips: ['Take thyroid medication on empty stomach', 'Check TSH levels every 6 months', 'Eat iodine-rich foods (seaweed, dairy)', 'Manage stress', 'Exercise regularly'],
            prevention: ['Use iodized salt', 'Regular thyroid screening', 'Avoid excess soy products', 'Manage stress', 'Maintain healthy selenium levels']
        },
        {
            id: 'allergy', name: 'Allergies', emoji: '🤧', color: '#F4511E',
            gradient: 'linear-gradient(135deg, #FBE9E7, #FFAB91)',
            tagline: 'Allergy & Immune Response',
            description: 'Allergies occur when the immune system overreacts to substances like pollen, dust, food, or medications. They can range from mild to life-threatening.',
            symptoms: ['Sneezing & runny nose', 'Itchy & watery eyes', 'Skin rashes & hives', 'Swelling (face/lips)', 'Breathing difficulty', 'Coughing'],
            medicines: [
                { name: 'Cetirizine 10mg', type: 'Oral', usage: 'Non-drowsy antihistamine', dosage: 'Once daily', price: '₹12' },
                { name: 'Montelukast 10mg', type: 'Oral', usage: 'Blocks allergy-related chemicals', dosage: 'Once daily at night', price: '₹85' },
                { name: 'Fluticasone Nasal Spray', type: 'Nasal', usage: 'Reduces nasal inflammation', dosage: '2 sprays each nostril daily', price: '₹180' },
                { name: 'Epinephrine (EpiPen)', type: 'Injectable', usage: 'Emergency treatment for anaphylaxis', dosage: 'Single use as needed', price: '₹3500' },
            ],
            dailyTips: ['Keep windows closed during pollen season', 'Use air purifiers at home', 'Wash bedding weekly in hot water', 'Shower after outdoor activities', 'Know your triggers'],
            prevention: ['Identify and avoid allergens', 'Keep home clean and dust-free', 'Consider allergy testing', 'Carry antihistamine always', 'Wear mask in dusty areas']
        },
        {
            id: 'dental', name: 'Dental Care', emoji: '🦷', color: '#0097A7',
            gradient: 'linear-gradient(135deg, #E0F7FA, #80DEEA)',
            tagline: 'Oral & Dental Health',
            description: 'Dental health affects overall well-being. Common issues include cavities, gum disease, bad breath, and tooth sensitivity. Prevention through daily oral hygiene is key.',
            symptoms: ['Toothache', 'Bleeding gums', 'Bad breath', 'Tooth sensitivity', 'Swollen gums', 'Difficulty chewing'],
            medicines: [
                { name: 'Sensodyne Toothpaste', type: 'Topical', usage: 'Desensitizing for sensitive teeth', dosage: 'Brush twice daily', price: '₹120' },
                { name: 'Chlorhexidine Mouthwash', type: 'Rinse', usage: 'Antibacterial for gum disease', dosage: 'Rinse twice daily', price: '₹150' },
                { name: 'Ibuprofen 400mg', type: 'Oral', usage: 'Pain relief for toothache', dosage: 'Every 6 hours as needed', price: '₹15' },
                { name: 'Amoxicillin 500mg', type: 'Oral', usage: 'Antibiotic for dental infections', dosage: 'Thrice daily for 5 days', price: '₹45' },
            ],
            dailyTips: ['Brush twice daily for 2 minutes', 'Floss once daily', 'Use fluoride toothpaste', 'Limit sugary snacks', 'Replace toothbrush every 3 months'],
            prevention: ['Regular dental check-ups every 6 months', 'Avoid tobacco products', 'Drink water after meals', 'Eat calcium-rich foods', 'Wear mouthguard for sports']
        },
        {
            id: 'bp', name: 'Blood Pressure', emoji: '🩺', color: '#D32F2F',
            gradient: 'linear-gradient(135deg, #FFEBEE, #EF9A9A)',
            tagline: 'Hypertension Management',
            description: 'High blood pressure (hypertension) is a silent killer that increases risk of heart attack, stroke, and kidney disease. Regular monitoring is essential.',
            symptoms: ['Usually symptomless', 'Severe headaches', 'Nosebleeds', 'Dizziness', 'Blurred vision', 'Chest pain'],
            medicines: [
                { name: 'Amlodipine 5mg', type: 'Oral', usage: 'Calcium channel blocker for BP', dosage: 'Once daily', price: '₹45' },
                { name: 'Telmisartan 40mg', type: 'Oral', usage: 'ARB, relaxes blood vessels', dosage: 'Once daily', price: '₹65' },
                { name: 'Hydrochlorothiazide 12.5mg', type: 'Oral', usage: 'Diuretic to reduce blood volume', dosage: 'Once daily morning', price: '₹20' },
                { name: 'Metoprolol 25mg', type: 'Oral', usage: 'Beta-blocker, slows heart rate', dosage: 'Twice daily', price: '₹35' },
            ],
            dailyTips: ['Check BP at home regularly', 'Reduce sodium to <5g/day', 'Exercise 30 min daily', 'Manage stress levels', 'Limit alcohol intake'],
            prevention: ['DASH diet (fruits, vegetables, low-fat)', 'Maintain healthy weight', 'Reduce salt intake', 'No smoking', 'Regular health check-ups']
        },
        {
            id: 'infection', name: 'Infections', emoji: '🦠', color: '#388E3C',
            gradient: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)',
            tagline: 'Bacterial & Viral Infections',
            description: 'Infections are caused by bacteria, viruses, fungi, or parasites. They can affect any part of the body and range from mild to severe.',
            symptoms: ['Fever & chills', 'Body aches', 'Fatigue', 'Swelling & redness', 'Pus or discharge', 'Loss of appetite'],
            medicines: [
                { name: 'Amoxicillin 500mg', type: 'Oral', usage: 'Broad-spectrum antibiotic', dosage: 'Thrice daily for 5-7 days', price: '₹45' },
                { name: 'Ciprofloxacin 500mg', type: 'Oral', usage: 'Fluoroquinolone antibiotic', dosage: 'Twice daily for 5-7 days', price: '₹60' },
                { name: 'Acyclovir 400mg', type: 'Oral', usage: 'Antiviral for herpes/chickenpox', dosage: '5 times daily for 5 days', price: '₹80' },
                { name: 'Fluconazole 150mg', type: 'Oral', usage: 'Antifungal for yeast infections', dosage: 'Single dose or as prescribed', price: '₹35' },
            ],
            dailyTips: ['Wash hands frequently', 'Cook food thoroughly', 'Drink clean water', 'Cover wounds properly', 'Complete full course of antibiotics'],
            prevention: ['Get vaccinated as recommended', 'Practice good hygiene', 'Avoid contact with infected persons', 'Boost immune system', 'Use protection during intimate contact']
        },
        {
            id: 'womens', name: "Women's Health", emoji: '🩷', color: '#E91E63',
            gradient: 'linear-gradient(135deg, #FCE4EC, #F8BBD0)',
            tagline: 'Gynecology & Reproductive Health',
            description: "Women's health covers menstrual health, PCOS, pregnancy care, menopause, and reproductive health. Regular check-ups and awareness are crucial.",
            symptoms: ['Irregular periods', 'Severe cramps', 'Hormonal acne', 'Mood swings', 'Breast tenderness', 'Hot flashes'],
            medicines: [
                { name: 'Mefenamic Acid 500mg', type: 'Oral', usage: 'Pain relief for menstrual cramps', dosage: 'Thrice daily during periods', price: '₹20' },
                { name: 'Iron + Folic Acid', type: 'Oral', usage: 'Prevents anemia during menstruation', dosage: 'Once daily', price: '₹60' },
                { name: 'Calcium + Vit D3', type: 'Oral', usage: 'Bone health for menopause', dosage: 'Once daily', price: '₹95' },
                { name: 'Evening Primrose Oil', type: 'Oral', usage: 'Reduces PMS symptoms', dosage: 'Once daily', price: '₹280' },
            ],
            dailyTips: ['Track menstrual cycle regularly', 'Eat iron-rich foods during periods', 'Exercise regularly', 'Practice stress management', 'Regular self-examination'],
            prevention: ['Annual gynecological check-up', 'Pap smear screening', 'Breast self-examination monthly', 'Healthy diet rich in calcium', 'Manage PCOS with lifestyle changes']
        },
        {
            id: 'child', name: 'Child Health', emoji: '👶', color: '#7CB342',
            gradient: 'linear-gradient(135deg, #F1F8E9, #DCEDC8)',
            tagline: 'Pediatric & Child Care',
            description: 'Child health covers vaccination, nutrition, growth milestones, and common childhood illnesses. Early care and monitoring ensure healthy development.',
            symptoms: ['Frequent colds & coughs', 'Ear infections', 'Poor appetite', 'Growth delay', 'Skin rashes', 'Behavioral changes'],
            medicines: [
                { name: 'Paracetamol Syrup', type: 'Oral', usage: 'Fever and pain relief for children', dosage: 'Based on weight, every 4-6 hrs', price: '₹40' },
                { name: 'ORS (Oral Rehydration)', type: 'Oral', usage: 'Prevents dehydration in diarrhea', dosage: 'Sips after each loose stool', price: '₹15' },
                { name: 'Zinc Syrup', type: 'Oral', usage: 'Reduces duration of diarrhea', dosage: 'Once daily for 14 days', price: '₹30' },
                { name: 'Vitamin A Drops', type: 'Oral', usage: 'Immunity booster for children', dosage: 'As per immunization schedule', price: '₹10' },
            ],
            dailyTips: ['Ensure balanced nutrition', 'Follow vaccination schedule', 'Encourage outdoor play', 'Limit screen time', 'Establish regular sleep routine'],
            prevention: ['Complete vaccination on time', 'Breastfeed for first 6 months', 'Regular growth monitoring', 'Teach hand hygiene', 'Annual pediatric check-ups']
        },
    ];

    // Combine all categories
    const allCategories = [...featuredCategories, ...backgroundCategories];

    const filterPills = ['all', 'Diabetes', 'Heart', 'Fever', 'Skin', 'Mental', 'Eye', 'BP', 'Joints'];

    const getFilteredCategories = () => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return allCategories.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.tagline.toLowerCase().includes(q) ||
                c.description.toLowerCase().includes(q) ||
                c.symptoms.some(s => s.toLowerCase().includes(q)) ||
                c.medicines.some(m => m.name.toLowerCase().includes(q))
            );
        }
        if (activeFilter !== 'all') {
            return allCategories.filter(c =>
                c.name.toLowerCase().includes(activeFilter.toLowerCase()) ||
                c.id.includes(activeFilter.toLowerCase())
            );
        }
        return showAllCategories ? allCategories : featuredCategories;
    };

    const filteredResults = getFilteredCategories();

    // ── Category Detail View ──
    if (selectedCategory) {
        const cat = allCategories.find(c => c.id === selectedCategory);
        if (!cat) { setSelectedCategory(null); return null; }

        return (
            <div className="screen health-research-screen active">
                <div className="hr-detail-header" style={{ background: cat.gradient }}>
                    <div className="btn-back" onClick={() => setSelectedCategory(null)}>
                        <Icons.Back />
                    </div>
                    <div className="hr-detail-hero">
                        <span className="hr-detail-emoji">{cat.emoji}</span>
                        <div>
                            <h1 className="hr-detail-title">{cat.name}</h1>
                            <p className="hr-detail-tagline">{cat.tagline}</p>
                        </div>
                    </div>
                </div>

                <div className="hr-detail-body">
                    <div className="hr-detail-section animate-slide-up">
                        <h3>📖 About {cat.name}</h3>
                        <p className="hr-detail-desc">{cat.description}</p>
                    </div>

                    <div className="hr-detail-section animate-slide-up" style={{ animationDelay: '0.05s' }}>
                        <h3>⚠️ Common Symptoms</h3>
                        <div className="hr-symptom-grid">
                            {cat.symptoms.map((s, i) => (
                                <div key={i} className="hr-symptom-chip" style={{ borderColor: cat.color }}>
                                    <span style={{ color: cat.color }}>•</span> {s}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="hr-detail-section animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        <h3>💊 Common Medicines</h3>
                        {cat.medicines.map((med, i) => (
                            <div key={i} className="hr-med-card glass-card">
                                <div className="hr-med-header">
                                    <div>
                                        <h4>{med.name}</h4>
                                        <span className="hr-med-type" style={{ background: `${cat.color}22`, color: cat.color }}>{med.type}</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span className="hr-med-price">{med.price}</span>
                                    </div>
                                </div>
                                <p className="hr-med-usage">{med.usage}</p>
                                <p className="hr-med-dosage">📋 {med.dosage}</p>
                            </div>
                        ))}
                    </div>

                    <div className="hr-detail-section animate-slide-up" style={{ animationDelay: '0.15s' }}>
                        <h3>💡 Daily Health Tips</h3>
                        <div className="hr-tips-list">
                            {cat.dailyTips.map((tip, i) => (
                                <div key={i} className="hr-tip-item">
                                    <span className="hr-tip-num">{i + 1}</span>
                                    <span>{tip}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="hr-detail-section animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <h3>🛡️ Prevention</h3>
                        <div className="hr-prevention-list">
                            {cat.prevention.map((p, i) => (
                                <div key={i} className="hr-prevent-item">
                                    <span className="hr-prevent-check">✓</span>
                                    <span>{p}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main Grid View ──
    return (
        <div className="screen health-research-screen active">
            <div className="hr-header">
                <div className="btn-back" onClick={() => navigateTo('home')}>
                    <Icons.Back />
                </div>
                <h1 className="hr-header-title">Health Research</h1>
                <span className="hr-cat-count">{allCategories.length} topics</span>
            </div>

            <div className="hr-body">
                {/* Enhanced Search */}
                <div className="hr-search-bar">
                    <span className="hr-search-icon">🔍</span>
                    <input type="text" placeholder="Search diseases, symptoms, medicines..."
                        value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setActiveFilter('all'); }}
                        spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none" data-gramm="false" />
                    {searchQuery && <span className="hr-search-clear" onClick={() => setSearchQuery('')}>✕</span>}
                </div>

                {/* Search hint */}
                {!searchQuery && (
                    <p className="hr-search-hint">Try: "headache", "acne", "thyroid", "anxiety", "paracetamol"</p>
                )}

                {/* Filter pills */}
                <div className="hr-filter-pills">
                    {filterPills.map(f => (
                        <button key={f}
                            className={`hr-pill ${activeFilter === f ? 'active' : ''}`}
                            onClick={() => { setActiveFilter(f); setSearchQuery(''); }}>
                            {f === 'all' ? 'All' : f}
                        </button>
                    ))}
                </div>

                {/* Search Results Count */}
                {searchQuery && (
                    <p className="hr-results-count">
                        {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} for "<strong>{searchQuery}</strong>"
                    </p>
                )}

                {/* Banner (only when no search) */}
                {!searchQuery && (
                    <div className="hr-info-banner glass-card">
                        <span className="hr-banner-icon">🏥</span>
                        <div className="hr-banner-text">
                            <strong>Research everyday health issues</strong>
                            <p>Search any disease, symptom, or medicine to learn about conditions and treatments</p>
                        </div>
                    </div>
                )}

                {/* Category Cards Grid */}
                <h3 className="hr-section-title">
                    {searchQuery ? 'Search Results' : showAllCategories ? 'All Health Topics' : 'Top Categories'}
                </h3>
                <div className="hr-category-grid">
                    {filteredResults.map((cat, idx) => (
                        <div key={cat.id} className="hr-cat-card animate-slide-up"
                            style={{ background: cat.gradient, animationDelay: `${idx * 0.04}s` }}
                            onClick={() => setSelectedCategory(cat.id)}>
                            <span className="hr-cat-emoji">{cat.emoji}</span>
                            <div className="hr-cat-info">
                                <span className="hr-cat-name">{cat.name}</span>
                                <span className="hr-cat-tagline">{cat.tagline}</span>
                            </div>
                            <span className="hr-cat-arrow">→</span>
                        </div>
                    ))}
                </div>

                {/* No Results */}
                {filteredResults.length === 0 && (
                    <div className="hr-no-results">
                        <span>🔍</span>
                        <p>No health topics found for "<strong>{searchQuery}</strong>"</p>
                        <small>Try different keywords like disease names, symptoms, or medicines</small>
                    </div>
                )}

                {/* Show All / Show Less */}
                {!searchQuery && activeFilter === 'all' && (
                    <button className="hr-show-all-btn" onClick={() => setShowAllCategories(!showAllCategories)}>
                        {showAllCategories
                            ? `Show Less ▲`
                            : `Show All ${allCategories.length} Topics ▼`
                        }
                    </button>
                )}

                <div className="hr-trust-section">
                    <p className="hr-trust-text">Trusted by <strong>10L+</strong> Health-Conscious Users ❤️</p>
                </div>
            </div>
        </div>
    );
};
