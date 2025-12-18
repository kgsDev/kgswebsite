// scripts/import-staff.js
// Updated script with proper relationship handling

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import axios from 'axios';
import slugify from 'slugify';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configuration
const directusUrl = process.env.PUBLIC_DIRECTUS_URL;
const adminToken = process.env.DIRECTUS_ADMIN_TOKEN;

// Set the correct collection name here
const COLLECTION = 'staff';

if (!adminToken) {
  console.error('ERROR: Missing DIRECTUS_ADMIN_TOKEN in .env file');
  process.exit(1);
}

// Create axios instance with base configuration
const api = axios.create({
  baseURL: directusUrl,
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }
});
console.log('Axios instance created successfully');

// Helper function to parse relationship data
function parseRelationship(value) {
  if (!value) return null;
  
  // Handle string values that look like arrays
  if (typeof value === 'string' && value.includes('[') && value.includes(']')) {
    try {
      // Extract numbers from string like "[1,2,3]"
      const matches = value.match(/\d+(\.\d+)?/g);
      if (matches) {
        return matches.map(Number);
      }
    } catch (error) {
      console.warn(`Failed to parse relationship value: ${value}`);
    }
  }
  
  // If it's a single number as string
  if (typeof value === 'string' && !isNaN(value)) {
    return parseInt(value, 10);
  }
  
  return value;
}

async function importStaff() {
  console.log('Starting staff import...');

  try {
    // Verify connection to Directus
    console.log('Verifying Directus connection...');
    try {
      const testResponse = await api.get(`/items/${COLLECTION}?limit=1`);
      console.log('Successfully connected to Directus');
      
      // If there's at least one record, show its structure
      if (testResponse.data && testResponse.data.data && testResponse.data.data.length > 0) {
        console.log('Sample item structure:', Object.keys(testResponse.data.data[0]).join(', '));
      }
    } catch (error) {
      console.error(`ERROR: Failed to connect to Directus or collection '${COLLECTION}' not found:`);
      if (error.response) {
        console.error(`Status: ${error.response.status}, Message: ${error.response.statusText}`);
      } else {
        console.error(error.message);
      }
      process.exit(1);
    }

    // Read the CSV file
    const csvPath = path.resolve('./data/KGSStaff_4_18_2025.csv');
    if (!fs.existsSync(csvPath)) {
      console.error(`ERROR: CSV file not found at: ${csvPath}`);
      process.exit(1);
    }
    
    const csvData = fs.readFileSync(csvPath, 'utf8');
    
    // Parse the CSV
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Found ${records.length} staff records to import`);

    // Process staff records
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        // Skip if missing required fields
        if (!record['Fname'] || !record['Last']) {
          console.warn(`Record #${i+1} missing first or last name, skipping.`);
          errorCount++;
          continue;
        }
        
        // Extract name information
        const firstName = record['Fname'].trim();
        const lastName = record['Last'].trim();
        
        // Create slug
        const slug = slugify(`${firstName}-${lastName}`, { lower: true });
        
        console.log(`\nProcessing record #${i+1}: ${firstName} ${lastName}`);
        
        // Handle department_head boolean conversion
        let departmentHead = false;
        if (record['Department_head'] === 'TRUE' || record['Department_head'] === 'true') {
          departmentHead = true;
        }
        
        // Parse department_id (one-to-many relationship)
        const departmentId = parseRelationship(record['Department_ID']);
        
        // Handle Location_ID (many-to-many relationship)
        let locationRelation = null;
        const locationId = parseRelationship(record['Location_ID']);
        
        if (Array.isArray(locationId)) {
          // For arrays, create the junction items format
          locationRelation = {
            create: locationId.map(id => ({ locations_id: id })),
            delete: []
          };
        } else if (locationId) {
          // For a single value
          locationRelation = {
            create: [{ locations_id: locationId }],
            delete: []
          };
        }
        
        // Handle Team_ID (many-to-many relationship)
        let teamRelation = null;
        const teamId = parseRelationship(record['Team_ID']);
        
        if (Array.isArray(teamId)) {
          // For arrays, create the junction items format
          teamRelation = {
            create: teamId.map(id => ({ team_id: id })),
            delete: []
          };
        } else if (teamId) {
          // For a single value
          teamRelation = {
            create: [{ team_id: teamId }],
            delete: []
          };
        }
        
        // Create staff member object with proper relationship formatting
        const staffData = {
          first_name: firstName,
          last_name: lastName,
          working_title: record['Title'] || null,
          expertise: record['Expertise'] || null,
          phone: record['Phone'] || null,
          email: record['Email'] || null,
          linkedin_url: record['LinkedIn'] || null,
          slug,
          status: "active",
          department_head: departmentHead,
          department_id: departmentId,
          // Add relationships only if they exist
          ...(locationRelation && { location: locationRelation }),
          ...(teamRelation && { team: teamRelation })
        };
        
        console.log('Data to be imported:', JSON.stringify(staffData, null, 2));
        
        // Check if staff member already exists
        try {
          const existingResponse = await api.get(`/items/${COLLECTION}`, {
            params: {
              filter: JSON.stringify({
                slug: {
                  _eq: slug
                }
              })
            }
          });
          
          if (existingResponse.data && 
              existingResponse.data.data && 
              existingResponse.data.data.length > 0) {
            console.log(`Staff member already exists with slug: ${slug}, skipping.`);
            successCount++;
            continue;
          }
        } catch (error) {
          console.warn(`Could not check if ${firstName} ${lastName} exists, will try to create anyway.`);
        }
        
        // Create staff member
        console.log(`Creating new staff member: ${firstName} ${lastName}`);
        
        try {
          const createResponse = await api.post(`/items/${COLLECTION}`, staffData);
          
          if (createResponse.data && createResponse.data.data) {
            console.log(`Success! Created staff member with ID: ${createResponse.data.data.id}`);
            successCount++;
          } else {
            console.warn('Warning: No confirmation data received from Directus.');
            errorCount++;
          }
        } catch (createError) {
          // Detailed error handling for creation errors
          console.error(`Failed to create staff member ${firstName} ${lastName}:`);
          
          if (createError.response && createError.response.data) {
            const errorData = createError.response.data;
            
            if (errorData.errors && errorData.errors.length > 0) {
              // Show specific field errors
              errorData.errors.forEach(err => {
                console.error(`  - Field '${err.field || 'unknown'}': ${err.message}`);
              });
            } else {
              // Generic error
              console.error(JSON.stringify(errorData, null, 2));
            }
          } else {
            console.error(createError.message);
          }
          
          errorCount++;
        }
      } catch (error) {
        const name = record['Fname'] || '';
        const last = record['Last'] || '';
        console.error(`Error processing record #${i+1} (${name} ${last}):`);
        console.error(error.message);
        errorCount++;
      }
    }
    
    console.log(`
    Import complete!
    - Successfully processed: ${successCount} staff members
    - Errors: ${errorCount} staff members
    `);
  } catch (error) {
    console.error('Import failed with unexpected error:');
    if (error.response && error.response.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

// Run the import
importStaff().catch(err => {
  console.error('Unhandled error in import process:');
  console.error(err.message);
  process.exit(1);
});
