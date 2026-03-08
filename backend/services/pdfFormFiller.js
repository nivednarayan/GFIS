// PDF Form Filler Service
// Fills government scheme PDF forms with extracted user data

const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

const DEFAULT_APPLICATION_TEMPLATE_PATH = path.join(__dirname, '..', 'APPLICATION FORMAT.pdf');

const APPLICATION_FORMAT_FIELD_MAPPING = {
  postAppliedFor: { x: 196, y: 658, fontSize: 9 },
  firstName: { x: 170, y: 607, fontSize: 8 },
  middleName: { x: 170, y: 579, fontSize: 8 },
  surname: { x: 170, y: 551, fontSize: 8 },
  fatherName: { x: 170, y: 505, fontSize: 9 },
  motherName: { x: 170, y: 470, fontSize: 9 },
  genderMaleMark: { x: 173, y: 439, fontSize: 10 },
  genderFemaleMark: { x: 266, y: 439, fontSize: 10 },
  dateOfBirth: { x: 170, y: 411, fontSize: 9 },
  ageYears: { x: 227, y: 384, fontSize: 9 },
  ageMonths: { x: 318, y: 384, fontSize: 9 },
  ageDays: { x: 407, y: 384, fontSize: 9 },
  permanentAddressLine1: { x: 72, y: 270, fontSize: 8 },
  permanentAddressLine2: { x: 72, y: 252, fontSize: 8 },
  po: { x: 112, y: 226, fontSize: 8 },
  city: { x: 112, y: 196, fontSize: 8 },
  district: { x: 112, y: 166, fontSize: 8 },
  state: { x: 112, y: 136, fontSize: 8 },
  pinCode: { x: 112, y: 106, fontSize: 8 }
};

const APPLICATION_FORMAT_BOX_LAYOUT = {
  firstName: { startX: 170, y: 607, boxStep: 13.1, maxChars: 34, fontSize: 8 },
  middleName: { startX: 170, y: 579, boxStep: 13.1, maxChars: 34, fontSize: 8 },
  surname: { startX: 170, y: 551, boxStep: 13.1, maxChars: 34, fontSize: 8 },
  fatherName: { startX: 170, y: 505, boxStep: 13.1, maxChars: 34, fontSize: 8 },
  motherName: { startX: 170, y: 470, boxStep: 13.1, maxChars: 34, fontSize: 8 },
  permanentAddressLine1: { startX: 79, y: 270, boxStep: 22.0, maxChars: 24, fontSize: 8 },
  permanentAddressLine2: { startX: 79, y: 252, boxStep: 22.0, maxChars: 24, fontSize: 8 },
  po: { startX: 112, y: 226, boxStep: 22.0, maxChars: 22, fontSize: 8 },
  city: { startX: 112, y: 196, boxStep: 22.0, maxChars: 22, fontSize: 8 },
  district: { startX: 112, y: 166, boxStep: 22.0, maxChars: 22, fontSize: 8 },
  state: { startX: 112, y: 136, boxStep: 22.0, maxChars: 22, fontSize: 8 },
  pinCode: { startX: 112, y: 106, boxStep: 22.0, maxChars: 10, fontSize: 8 }
};

function drawTextInBoxes(page, value, layout) {
  if (!value || !layout) {
    return;
  }

  const normalizedValue = String(value).toUpperCase().replace(/\s+/g, ' ').trim();
  const chars = normalizedValue.slice(0, layout.maxChars).split('');
  chars.forEach((char, index) => {
    page.drawText(char, {
      x: layout.startX + (index * layout.boxStep),
      y: layout.y,
      size: layout.fontSize,
      color: rgb(0, 0, 0)
    });
  });
}

function drawApplicationFormatFields(page, formData) {
  const drawPlain = (fieldKey) => {
    const mapping = APPLICATION_FORMAT_FIELD_MAPPING[fieldKey];
    const value = formData[fieldKey];
    if (!mapping || !value) return;

    page.drawText(String(value), {
      x: mapping.x,
      y: mapping.y,
      size: mapping.fontSize,
      color: rgb(0, 0, 0)
    });
  };

  drawPlain('postAppliedFor');
  drawPlain('genderMaleMark');
  drawPlain('genderFemaleMark');
  drawPlain('dateOfBirth');
  drawPlain('ageYears');
  drawPlain('ageMonths');
  drawPlain('ageDays');

  Object.keys(APPLICATION_FORMAT_BOX_LAYOUT).forEach((fieldKey) => {
    drawTextInBoxes(page, formData[fieldKey], APPLICATION_FORMAT_BOX_LAYOUT[fieldKey]);
  });
}

/**
 * Maps JSON data to field positions in the pension form PDF
 * Coordinates are approximate based on typical form layouts
 */
const PENSION_FORM_FIELD_MAPPING = {
  // Applicant's Details
  applicantName: { x: 170, y: 673, fontSize: 10 },
  fatherHusbandName: { x: 170, y: 653, fontSize: 10 },
  markOfIdentification: { x: 170, y: 633, fontSize: 10 },
  dateOfBirth: { x: 170, y: 613, fontSize: 10 },
  aadharNo: { x: 170, y: 593, fontSize: 10 },
  gender: { x: 280, y: 573, fontSize: 10 },
  email: { x: 170, y: 553, fontSize: 10 },
  mobileNo: { x: 360, y: 553, fontSize: 10 },
  maritalStatus: { x: 350, y: 533, fontSize: 10 },
  religion: { x: 170, y: 513, fontSize: 10 },
  
  // Address - Current
  houseNoFlat: { x: 170, y: 468, fontSize: 9 },
  sectorVillage: { x: 360, y: 468, fontSize: 9 },
  stateUT: { x: 170, y: 448, fontSize: 9 },
  pinCode: { x: 360, y: 448, fontSize: 9 },
  yearsInChandigarh: { x: 170, y: 428, fontSize: 9 },
  
  // Address - Permanent
  permanentHouseNo: { x: 170, y: 388, fontSize: 9 },
  permanentSector: { x: 360, y: 388, fontSize: 9 },
  permanentState: { x: 170, y: 368, fontSize: 9 },
  permanentPinCode: { x: 360, y: 368, fontSize: 9 },
  
  // Income Details
  maintainingYourself: { x: 170, y: 318, fontSize: 9 },
  presentFamilyIncome: { x: 210, y: 298, fontSize: 9 },
  occupation: { x: 170, y: 278, fontSize: 9 },
  
  // Property & Financial
  pensionReceipt: { x: 255, y: 258, fontSize: 9 },
  propertyDetails: { x: 255, y: 238, fontSize: 9 },
  realEstateValue: { x: 170, y: 218, fontSize: 9 },
  govtSecuritiesValue: { x: 360, y: 218, fontSize: 9 },
  
  // Verification details
  dateOfVerification: { x: 170, y: 146, fontSize: 9 },
  verificationAge: { x: 292, y: 146, fontSize: 9 },
  verificationDate: { x: 446, y: 146, fontSize: 9 }
};

/**
 * Generic field mapping for other scheme forms
 */
const GENERIC_FIELD_MAPPING = {
  name: { x: 180, y: 745, fontSize: 10 },
  fatherName: { x: 180, y: 725, fontSize: 10 },
  age: { x: 180, y: 705, fontSize: 10 },
  dob: { x: 180, y: 685, fontSize: 10 },
  aadhar: { x: 180, y: 665, fontSize: 10 },
  phone: { x: 380, y: 625, fontSize: 10 },
  email: { x: 180, y: 625, fontSize: 10 },
  address: { x: 180, y: 540, fontSize: 9 },
  pincode: { x: 380, y: 520, fontSize: 9 },
  income: { x: 180, y: 360, fontSize: 9 }
};

/**
 * Maps user data fields to form fields based on scheme
 */
function mapDataToFormFields(userData, scheme = 'pension') {
  const formData = {};

  const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';
  const pick = (...keys) => {
    for (const key of keys) {
      if (hasValue(userData[key])) {
        return String(userData[key]).trim();
      }
    }
    return null;
  };

  const truncate = (value, maxLength = 45) => {
    if (!value) return value;
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
  };

  if (scheme === 'application_format') {
    const fullName = pick('name', 'applicantName');
    const nameParts = fullName ? fullName.split(/\s+/).filter(Boolean) : [];

    let firstName = pick('firstName') || '';
    let middleName = pick('middleName') || '';
    let surname = pick('surname', 'lastName') || '';

    if (!firstName && !middleName && !surname) {
      if (nameParts.length === 1) {
        firstName = nameParts[0];
      } else if (nameParts.length === 2) {
        firstName = nameParts[0];
        surname = nameParts[1];
      } else if (nameParts.length >= 3) {
        firstName = nameParts[0];
        surname = nameParts[nameParts.length - 1];
        middleName = nameParts.slice(1, -1).join(' ');
      }
    }

    const gender = pick('gender');
    const normalizedGender = gender ? gender.toLowerCase() : '';
    const dateOfBirth = pick('dateOfBirth', 'dob');
    const age = pick('age');
    const postAppliedFor = pick('postAppliedFor');

    const permanentAddress = pick('permanentAddress', 'address');
    let permanentAddressLine1 = null;
    let permanentAddressLine2 = null;

    if (permanentAddress) {
      const addressParts = permanentAddress
        .split(',')
        .map(part => part.trim())
        .filter(Boolean);

      if (addressParts.length > 1) {
        permanentAddressLine1 = truncate(addressParts[0], 52);
        permanentAddressLine2 = truncate(addressParts.slice(1).join(', '), 52);
      } else {
        permanentAddressLine1 = truncate(permanentAddress, 52);
      }
    }

    if (postAppliedFor) formData.postAppliedFor = truncate(postAppliedFor, 30);
    if (firstName) formData.firstName = truncate(firstName, 16);
    if (middleName) formData.middleName = truncate(middleName, 16);
    if (surname) formData.surname = truncate(surname, 16);
    if (pick('fatherName', 'fatherHusbandName')) formData.fatherName = truncate(pick('fatherName', 'fatherHusbandName'), 34);
    if (pick('motherName')) formData.motherName = truncate(pick('motherName'), 34);

    if (normalizedGender === 'male' || normalizedGender === 'm') {
      formData.genderMaleMark = 'X';
    }
    if (normalizedGender === 'female' || normalizedGender === 'f') {
      formData.genderFemaleMark = 'X';
    }

    if (dateOfBirth) formData.dateOfBirth = truncate(dateOfBirth, 12);
    if (age) formData.ageYears = truncate(age, 2);

    if (permanentAddressLine1) formData.permanentAddressLine1 = permanentAddressLine1;
    if (permanentAddressLine2) formData.permanentAddressLine2 = permanentAddressLine2;

    if (pick('po', 'postOffice')) formData.po = truncate(pick('po', 'postOffice'), 20);
    if (pick('city')) formData.city = truncate(pick('city'), 20);
    if (pick('district')) formData.district = truncate(pick('district'), 20);
    if (pick('state', 'stateUT')) formData.state = truncate(pick('state', 'stateUT'), 20);
    if (pick('pinCode', 'pincode')) formData.pinCode = truncate(pick('pinCode', 'pincode'), 8);

    return formData;
  }

  if (scheme !== 'pension') {
    const genericName = pick('name', 'applicantName');
    const genericFather = pick('fatherName', 'fatherHusbandName');
    const genericAge = pick('age');
    const genericDob = pick('dateOfBirth', 'dob');
    const genericAadhar = pick('aadharNumber', 'aadharNo', 'aadhar', 'aadhaar');
    const genericPhone = pick('phoneNumber', 'mobileNo', 'phone', 'mobile');
    const genericEmail = pick('email');
    const genericAddress = pick('address');
    const genericPin = pick('pinCode', 'pincode');
    const genericIncome = pick('income', 'monthlyIncome', 'presentFamilyIncome');

    if (genericName) formData.name = truncate(genericName, 40);
    if (genericFather) formData.fatherName = truncate(genericFather, 40);
    if (genericAge) formData.age = genericAge;
    if (genericDob) formData.dob = genericDob;
    if (genericAadhar) formData.aadhar = genericAadhar;
    if (genericPhone) formData.phone = genericPhone;
    if (genericEmail) formData.email = truncate(genericEmail, 40);
    if (genericAddress) formData.address = truncate(genericAddress, 60);
    if (genericPin) formData.pincode = genericPin;
    if (genericIncome) formData.income = genericIncome;

    return formData;
  }

  const applicantName = pick('applicantName', 'name');
  const fatherHusbandName = pick('fatherHusbandName', 'fatherName');
  const markOfIdentification = pick('markOfIdentification', 'identificationMark');
  const dateOfBirth = pick('dateOfBirth', 'dob');
  const aadharNo = pick('aadharNumber', 'aadharNo', 'aadhar', 'aadhaar');
  const gender = pick('gender');
  const email = pick('email');
  const mobileNo = pick('mobileNo', 'phoneNumber', 'phone', 'mobile');
  const maritalStatus = pick('maritalStatus');
  const religion = pick('religion');

  const houseNoFlat = pick('houseNoFlat', 'houseNumber', 'houseNo');
  const sectorVillage = pick('sectorVillage', 'village', 'sector');
  const stateUT = pick('stateUT', 'state');
  const pinCode = pick('pinCode', 'pincode');
  const yearsInChandigarh = pick('yearsInChandigarh', 'yearsOfStay');

  const permanentHouseNo = pick('permanentHouseNo', 'permanentHouseNumber');
  const permanentSector = pick('permanentSector', 'permanentVillage', 'permanentAddressLine2');
  const permanentState = pick('permanentState', 'permanentStateUT');
  const permanentPinCode = pick('permanentPinCode', 'permanentPincode');

  const maintainingYourself = pick('maintainingYourself');
  const presentFamilyIncome = pick('presentFamilyIncome', 'monthlyIncome', 'income');

  if (applicantName) formData.applicantName = truncate(applicantName, 38);
  if (fatherHusbandName) formData.fatherHusbandName = truncate(fatherHusbandName, 38);
  if (markOfIdentification) formData.markOfIdentification = truncate(markOfIdentification, 38);
  if (dateOfBirth) formData.dateOfBirth = dateOfBirth;
  if (aadharNo) formData.aadharNo = aadharNo;
  if (gender) formData.gender = truncate(gender, 14);
  if (email) formData.email = truncate(email, 38);
  if (mobileNo) formData.mobileNo = mobileNo;
  if (maritalStatus) formData.maritalStatus = truncate(maritalStatus, 16);
  if (religion) formData.religion = truncate(religion, 16);

  if (houseNoFlat) formData.houseNoFlat = truncate(houseNoFlat, 32);
  if (sectorVillage) formData.sectorVillage = truncate(sectorVillage, 28);
  if (stateUT) formData.stateUT = truncate(stateUT, 24);
  if (pinCode) formData.pinCode = pinCode;
  if (yearsInChandigarh) formData.yearsInChandigarh = yearsInChandigarh;

  if (permanentHouseNo) formData.permanentHouseNo = truncate(permanentHouseNo, 32);
  if (permanentSector) formData.permanentSector = truncate(permanentSector, 28);
  if (permanentState) formData.permanentState = truncate(permanentState, 24);
  if (permanentPinCode) formData.permanentPinCode = permanentPinCode;

  if (maintainingYourself) formData.maintainingYourself = truncate(maintainingYourself, 48);
  if (presentFamilyIncome) formData.presentFamilyIncome = presentFamilyIncome;

  return formData;
}

/**
 * Creates a blank pension form PDF
 * This is a simplified version - in production, use an actual form template
 */
async function createBlankPensionForm() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();

  // Header
  page.drawText('APPLICATION FORM', {
    x: 200,
    y: height - 50,
    size: 16,
    color: rgb(0, 0, 0)
  });
  
  page.drawText('OF OLD AGE PENSION', {
    x: 190,
    y: height - 70,
    size: 14,
    color: rgb(0, 0, 0)
  });
  
  page.drawText('Fields marked with (*) are mandatory', {
    x: 350,
    y: height - 85,
    size: 8,
    color: rgb(1, 0, 0)
  });

  // Draw form labels
  const labels = [
    { text: "Applicant's Name*", y: 745 },
    { text: "Father's / Husband's Name*", y: 725 },
    { text: "Mark of Identification*", y: 705 },
    { text: "Date of Birth / Year*", y: 685 },
    { text: "Aadhaar No.*", y: 665 },
    { text: "Gender*", y: 645 },
    { text: "E-mail", y: 625 },
    { text: "Mobile No*", y: 625 },
    { text: "Marital Status*", y: 605 },
    { text: "Religion", y: 585 },
    { text: "Applicant's Address (where he/she is residing from last three years):", y: 560 },
    { text: "House No / Flat No.*", y: 540 },
    { text: "Sector / Village*", y: 540 },
    { text: "State/UT*", y: 520 },
    { text: "Pin Code*", y: 520 },
    { text: "Years of Stay in Chandigarh", y: 500 },
    { text: "Permanent Address", y: 480 },
    { text: "Particulars of Earning Details:", y: 400 },
    { text: "How you have been maintaining yourself so far?*", y: 380 },
    { text: "Present Total family monthly income*", y: 360 },
    { text: "Occupation (Before becoming unfit to Earn)*", y: 340 },
  ];

  labels.forEach(label => {
    page.drawText(label.text, {
      x: 50,
      y: label.y,
      size: 9,
      color: rgb(0, 0, 0)
    });
  });

  return pdfDoc;
}

/**
 * Fills a PDF form with user data
 * @param {Object} userData - User data to fill in the form
 * @param {String} scheme - Scheme type (pension, pmkisan, etc.)
 * @param {Buffer} templatePdf - Optional PDF template buffer
 * @returns {Buffer} - Filled PDF as buffer
 */
async function fillPdfForm(userData, scheme = 'pension', templatePdf = null) {
  try {
    let pdfDoc;
    let resolvedScheme = scheme;

    if (templatePdf) {
      // Load existing PDF template
      pdfDoc = await PDFDocument.load(templatePdf);
    } else {
      if (scheme === 'pension') {
        try {
          const defaultTemplateBuffer = await fs.readFile(DEFAULT_APPLICATION_TEMPLATE_PATH);
          pdfDoc = await PDFDocument.load(defaultTemplateBuffer);
          resolvedScheme = 'application_format';
        } catch {
          pdfDoc = await createBlankPensionForm();
        }
      } else {
        pdfDoc = await createBlankPensionForm();
      }
    }

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Map user data to form fields
    const formData = mapDataToFormFields(userData, resolvedScheme);
    const fieldMapping = resolvedScheme === 'application_format'
      ? APPLICATION_FORMAT_FIELD_MAPPING
      : (resolvedScheme === 'pension' ? PENSION_FORM_FIELD_MAPPING : GENERIC_FIELD_MAPPING);

    if (resolvedScheme === 'application_format') {
      drawApplicationFormatFields(firstPage, formData);
    } else {
      Object.keys(formData).forEach(fieldKey => {
        if (fieldMapping[fieldKey] && formData[fieldKey]) {
          const field = fieldMapping[fieldKey];
          firstPage.drawText(String(formData[fieldKey]), {
            x: field.x,
            y: field.y,
            size: field.fontSize,
            color: rgb(0, 0, 0)
          });
        }
      });
    }

    // Serialize the PDF document to bytes
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    console.error('Error filling PDF form:', error);
    throw new Error(`Failed to fill PDF form: ${error.message}`);
  }
}

/**
 * Fills PDF using form fields (if PDF has interactive form fields)
 * @param {Buffer} templatePdf - PDF template with form fields
 * @param {Object} fieldMapping - Mapping of data keys to PDF field names
 * @param {Object} userData - User data to fill
 * @returns {Buffer} - Filled PDF
 */
async function fillInteractivePdfForm(templatePdf, fieldMapping, userData) {
  try {
    const pdfDoc = await PDFDocument.load(templatePdf);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    // Log available fields (for debugging)
    console.log('Available PDF form fields:', fields.map(f => f.getName()));

    // Fill fields based on mapping
    Object.keys(fieldMapping).forEach(dataKey => {
      const fieldName = fieldMapping[dataKey];
      const value = userData[dataKey];

      if (value !== undefined && value !== null) {
        try {
          const field = form.getTextField(fieldName);
          field.setText(String(value));
        } catch (error) {
          // Field might not exist or might be a different type
          console.warn(`Could not fill field ${fieldName}:`, error.message);
        }
      }
    });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    console.error('Error filling interactive PDF form:', error);
    throw new Error(`Failed to fill interactive PDF form: ${error.message}`);
  }
}

module.exports = {
  fillPdfForm,
  fillInteractivePdfForm,
  createBlankPensionForm,
  mapDataToFormFields
};
