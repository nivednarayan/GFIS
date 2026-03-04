/**
 * Find missing required fields that were not extracted
 */

function findMissingFields(extractedData, requiredFields) {
  const missingFields = [];
  
  for (const field of requiredFields) {
    // Check if field is required and not present in extracted data
    if (field.required && !(field.name in extractedData)) {
      missingFields.push({
        name: field.name,
        label: field.label,
        type: field.type
      });
    }
  }
  
  return missingFields;
}

module.exports = findMissingFields;
