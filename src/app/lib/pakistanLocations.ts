export type LocationSuggestion = {
  district?: string;
  province?: string;
};

export const pakistanDistricts = [
  "Faisalabad", "Lahore", "Sheikhupura", "Nankana Sahib", "Kasur", "Okara", "Sahiwal", "Pakpattan",
  "Toba Tek Singh", "Jhang", "Chiniot", "Sargodha", "Khushab", "Mianwali", "Bhakkar", "Gujranwala",
  "Gujrat", "Sialkot", "Narowal", "Hafizabad", "Mandi Bahauddin", "Rawalpindi", "Attock", "Jhelum",
  "Chakwal", "Talagang", "Murree", "Multan", "Khanewal", "Lodhran", "Vehari", "Bahawalpur",
  "Bahawalnagar", "Rahim Yar Khan", "Dera Ghazi Khan", "Rajanpur", "Muzaffargarh", "Layyah", "Kot Addu",
  "Karachi Central", "Karachi East", "Karachi South", "Karachi West", "Korangi", "Malir", "Keamari",
  "Hyderabad", "Jamshoro", "Matiari", "Tando Allahyar", "Tando Muhammad Khan", "Badin", "Thatta", "Sujawal",
  "Mirpur Khas", "Umerkot", "Tharparkar", "Shaheed Benazirabad", "Naushahro Feroze", "Sanghar", "Sukkur",
  "Khairpur", "Ghotki", "Larkana", "Qambar Shahdadkot", "Shikarpur", "Jacobabad", "Kashmore",
  "Peshawar", "Charsadda", "Nowshera", "Mardan", "Swabi", "Kohat", "Hangu", "Karak", "Bannu",
  "Lakki Marwat", "Dera Ismail Khan", "Tank", "Abbottabad", "Haripur", "Mansehra", "Battagram", "Torghar",
  "Swat", "Buner", "Shangla", "Malakand", "Lower Dir", "Upper Dir", "Lower Chitral", "Upper Chitral",
  "Bajaur", "Khyber", "Kurram", "Mohmand", "North Waziristan", "South Waziristan Lower", "South Waziristan Upper",
  "Quetta", "Pishin", "Killa Abdullah", "Chaman", "Mastung", "Kalat", "Surab", "Khuzdar", "Awaran",
  "Lasbela", "Hub", "Gwadar", "Kech", "Panjgur", "Kharan", "Washuk", "Chagai", "Nushki", "Zhob",
  "Sherani", "Killa Saifullah", "Loralai", "Duki", "Musakhel", "Barkhan", "Sibi", "Harnai", "Ziarat",
  "Kohlu", "Dera Bugti", "Nasirabad", "Jaffarabad", "Sohbatpur", "Kachhi", "Usta Muhammad",
  "Islamabad", "Muzaffarabad", "Neelum", "Jhelum Valley", "Bagh", "Haveli", "Poonch", "Sudhnoti",
  "Kotli", "Mirpur", "Bhimber", "Gilgit", "Hunza", "Nagar", "Ghizer", "Gupis-Yasin", "Skardu", "Shigar",
  "Kharmang", "Ghanche", "Astore", "Diamer", "Darel", "Tangir"
];

export const pakistanMajorCities = [
  "Faisalabad", "Jaranwala", "Samundri", "Tandlianwala", "Chak Jhumra", "Mamu Kanjan", "Khurrianwala",
  "Lahore", "Raiwind", "Kasur", "Pattoki", "Chunian", "Kot Radha Kishan", "Sheikhupura", "Muridke",
  "Nankana Sahib", "Shahkot", "Sangla Hill", "Okara", "Depalpur", "Renala Khurd", "Sahiwal", "Chichawatni",
  "Pakpattan", "Arifwala", "Toba Tek Singh", "Gojra", "Kamalia", "Jhang", "Shorkot", "Chiniot",
  "Sargodha", "Bhalwal", "Shahpur", "Sillanwali", "Khushab", "Jauharabad", "Mianwali", "Isa Khel",
  "Bhakkar", "Darya Khan", "Gujranwala", "Wazirabad", "Kamoke", "Nowshera Virkan", "Gujrat", "Kharian",
  "Lalamusa", "Sarai Alamgir", "Sialkot", "Daska", "Sambrial", "Pasrur", "Narowal", "Shakargarh",
  "Hafizabad", "Pindi Bhattian", "Mandi Bahauddin", "Phalia", "Malakwal", "Rawalpindi", "Taxila", "Gujar Khan",
  "Kahuta", "Kallar Syedan", "Murree", "Attock", "Hazro", "Hasan Abdal", "Jhelum", "Dina", "Sohawa",
  "Chakwal", "Talagang", "Multan", "Shujabad", "Jalalpur Pirwala", "Khanewal", "Kabirwala", "Mian Channu",
  "Lodhran", "Dunyapur", "Kahror Pacca", "Vehari", "Burewala", "Mailsi", "Bahawalpur", "Ahmedpur East",
  "Hasilpur", "Yazman", "Bahawalnagar", "Chishtian", "Haroonabad", "Fort Abbas", "Rahim Yar Khan", "Sadiqabad",
  "Khanpur", "Liaquatpur", "Dera Ghazi Khan", "Taunsa", "Rajanpur", "Jampur", "Rojhan", "Muzaffargarh",
  "Kot Addu", "Alipur", "Jatoi", "Layyah", "Karor Lal Esan",
  "Karachi", "Hyderabad", "Kotri", "Jamshoro", "Matiari", "Hala", "Tando Allahyar", "Tando Muhammad Khan",
  "Badin", "Matli", "Thatta", "Sujawal", "Mirpur Khas", "Umerkot", "Mithi", "Islamkot", "Nawabshah",
  "Sakrand", "Sanghar", "Tando Adam", "Shahdadpur", "Sukkur", "Rohri", "Khairpur", "Gambat", "Ghotki",
  "Mirpur Mathelo", "Larkana", "Ratodero", "Shikarpur", "Jacobabad", "Kandhkot",
  "Peshawar", "Charsadda", "Nowshera", "Mardan", "Takht Bhai", "Swabi", "Topi", "Kohat", "Hangu", "Karak",
  "Bannu", "Lakki Marwat", "Dera Ismail Khan", "Tank", "Abbottabad", "Haripur", "Mansehra", "Balakot",
  "Swat", "Mingora", "Saidu Sharif", "Buner", "Shangla", "Batkhela", "Timergara", "Dir", "Chitral",
  "Quetta", "Chaman", "Pishin", "Mastung", "Kalat", "Khuzdar", "Hub", "Uthal", "Gwadar", "Turbat",
  "Panjgur", "Kharan", "Nushki", "Zhob", "Loralai", "Sibi", "Dera Murad Jamali", "Dera Allah Yar",
  "Islamabad", "Muzaffarabad", "Mirpur AJK", "Kotli AJK", "Rawalakot", "Bagh AJK", "Gilgit", "Skardu",
  "Hunza", "Chilas"
];

const cityHints: Record<string, LocationSuggestion> = {
  faisalabad: { district: "Faisalabad", province: "Punjab" },
  jaranwala: { district: "Faisalabad", province: "Punjab" },
  samundri: { district: "Faisalabad", province: "Punjab" },
  tandlianwala: { district: "Faisalabad", province: "Punjab" },
  "chak jhumra": { district: "Faisalabad", province: "Punjab" },
  "mamu kanjan": { district: "Faisalabad", province: "Punjab" },
  khurrianwala: { district: "Faisalabad", province: "Punjab" },
  lahore: { district: "Lahore", province: "Punjab" },
  sheikhupura: { district: "Sheikhupura", province: "Punjab" },
  gujranwala: { district: "Gujranwala", province: "Punjab" },
  sialkot: { district: "Sialkot", province: "Punjab" },
  rawalpindi: { district: "Rawalpindi", province: "Punjab" },
  multan: { district: "Multan", province: "Punjab" },
  bahawalpur: { district: "Bahawalpur", province: "Punjab" },
  "rahim yar khan": { district: "Rahim Yar Khan", province: "Punjab" },
  karachi: { province: "Sindh" },
  hyderabad: { district: "Hyderabad", province: "Sindh" },
  sukkur: { district: "Sukkur", province: "Sindh" },
  larkana: { district: "Larkana", province: "Sindh" },
  peshawar: { district: "Peshawar", province: "KPK" },
  mardan: { district: "Mardan", province: "KPK" },
  abbottabad: { district: "Abbottabad", province: "KPK" },
  quetta: { district: "Quetta", province: "Balochistan" },
  islamabad: { district: "Islamabad", province: "Federal" },
  muzaffarabad: { district: "Muzaffarabad", province: "Azad Kashmir" },
  gilgit: { district: "Gilgit", province: "Gilgit-Baltistan" },
  skardu: { district: "Skardu", province: "Gilgit-Baltistan" },
};

export function suggestLocation(city: string): LocationSuggestion {
  return cityHints[String(city || "").trim().toLowerCase()] || {};
}
