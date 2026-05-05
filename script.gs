/**
 * ==========================================
 * 1. MASTER CONFIGURATION
 * Update these values for each new project
 * ==========================================
 */
const CONFIG = {
  // Your dropdown categories or groups
  CATEGORIES: [
    "Category A", "Category B", "Category C", 
    "Group 1", "Group 2", "VIP Customers"
  ],
  
  // Spreadsheet Settings
  MENU_NAME: '🟢 CRM Sync Tool',
  DATA_SHEET_NAME: 'Processed_data',
  
  // Exact Column Headers in your Sheet
  COL_BROADCAST_NAME: 'Broadcast_Name',
  COL_PHONE_NUMBER: 'WhatsApp_Number',
  COL_CATEGORY: 'category',
  COL_SYNC_TRACKER: 'Synced_to_Contacts', // Will be auto-created if missing
  
  // Google Drive Export Settings
  DRIVE_FOLDER_NAME: 'WhatsApp Contact Exports' 
};

/**
 * ==========================================
 * 2. MENU CREATION
 * ==========================================
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu(CONFIG.MENU_NAME)
    .addItem('📥 1. Export Selected to CSVs', 'showCsvPopup')
    .addItem('📱 2. Sync Selected to Google Contacts', 'showSyncPopup')
    .addToUi();
}

/**
 * ==========================================
 * 3. CSV EXPORT LOGIC
 * ==========================================
 */
function showCsvPopup() {
  let checkboxesHtml = CONFIG.CATEGORIES.sort().map(cat =>
    `<label class="cb-container"><input type="checkbox" value="${cat}" class="cat-checkbox"> ${cat}</label>`
  ).join('');

  const htmlString = `
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 15px; color: #333; }
        h2 { margin-top: 0; color: #25D366; }
        p { font-size: 13px; color: #555; }
        .scroll-box { max-height: 280px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; border-radius: 4px; margin-bottom: 15px; background: #f9f9f9; }
        .cb-container { display: flex; align-items: center; margin-bottom: 8px; font-size: 14px; cursor: pointer; }
        .cb-container input { margin-right: 10px; cursor: pointer; width: 16px; height: 16px; }
        button { width: 100%; padding: 12px; margin-top: 10px; border: none; border-radius: 4px; font-size: 14px; font-weight: bold; cursor: pointer; transition: 0.3s; }
        .btn-sync { background-color: #25D366; color: white; }
        .btn-sync:hover { background-color: #1ebe5c; }
        .btn-select { background-color: #e8f0fe; color: #1a73e8; border: 1px solid #1a73e8; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <h2>📥 CSV Export</h2>
      <p>Select categories to export. This will create clean CSV files in your Google Drive.</p>
      <button class="btn-select" onclick="selectAll()">✅ Select All / Deselect All</button>
      <div class="scroll-box">${checkboxesHtml}</div>
      <button id="runBtn" class="btn-sync" onclick="runExport()">🚀 Generate CSV Files</button>
      <script>
        let allSelected = false;
        function selectAll() {
          allSelected = !allSelected;
          document.querySelectorAll('.cat-checkbox').forEach(cb => cb.checked = allSelected);
        }
        function runExport() {
          const checkboxes = document.querySelectorAll('.cat-checkbox:checked');
          const selectedCats = Array.from(checkboxes).map(cb => cb.value);
          if(selectedCats.length === 0) { alert('Please check at least one category!'); return; }
          const btn = document.getElementById('runBtn');
          btn.innerText = "⏳ Generating Files... Please wait!";
          btn.disabled = true; btn.style.backgroundColor = "#999";
          google.script.run
            .withSuccessHandler(function() { google.script.host.close(); })
            .withFailureHandler(function(err) {
              alert("Error: " + err.message);
              btn.innerText = "🚀 Generate CSV Files";
              btn.disabled = false; btn.style.backgroundColor = "#25D366";
            }).executeWhatsAppExport(selectedCats);
        }
      </script>
    </body>
  </html>
  `;
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(htmlString).setWidth(450).setHeight(600), 'CSV Exporter');
}

function executeWhatsAppExport(selectedCategories) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.DATA_SHEET_NAME);
  if (!sheet) throw new Error("Sheet '" + CONFIG.DATA_SHEET_NAME + "' not found!");

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  var headers = data[0];
  var bNameIdx = headers.indexOf(CONFIG.COL_BROADCAST_NAME);
  var phoneIdx = headers.indexOf(CONFIG.COL_PHONE_NUMBER);
  var catIdx = headers.indexOf(CONFIG.COL_CATEGORY); 

  if (bNameIdx === -1 || phoneIdx === -1 || catIdx === -1) {
    throw new Error("Missing required columns. Please check your CONFIG block matches your sheet headers.");
  }

  var csvGroups = {};
  var totalContactsExported = 0;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var category = row[catIdx] ? row[catIdx].toString().trim() : "";
    
    if (!selectedCategories.includes(category)) continue;

    var broadcastName = row[bNameIdx] ? row[bNameIdx].toString().trim() : "";
    var phone = row[phoneIdx] ? row[phoneIdx].toString().trim() : "";

    if (broadcastName !== "" && phone !== "") {
      var nameParts = broadcastName.split("_");
      var filePrefix = nameParts.length >= 2 ? (nameParts[0] + "_" + nameParts[1]) : "Group";

      if (!csvGroups[filePrefix]) csvGroups[filePrefix] = ["Name,Phone"];
      csvGroups[filePrefix].push('"' + broadcastName + '","' + phone + '"');
      totalContactsExported++;
    }
  }

  var folders = DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER_NAME);
  var targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME); 

  var filesCreatedCount = 0;
  for (var prefix in csvGroups) {
    var csvString = csvGroups[prefix].join("\n");
    var fileName = prefix + "_Export.csv";
    var blob = Utilities.newBlob(csvString, MimeType.CSV, fileName);
    targetFolder.createFile(blob);
    filesCreatedCount++;
  }

  if (filesCreatedCount > 0) {
    SpreadsheetApp.getUi().alert("✅ Export Complete!\n\nCreated " + filesCreatedCount + " CSV files inside the folder: '" + CONFIG.DRIVE_FOLDER_NAME + "'\nTotal contacts exported: " + totalContactsExported);
  } else {
    SpreadsheetApp.getUi().alert("ℹ️ No data found for the selected categories.");
  }
}

/**
 * ==========================================
 * 4. GOOGLE CONTACTS SYNC LOGIC
 * ==========================================
 */
function showSyncPopup() {
  let checkboxesHtml = CONFIG.CATEGORIES.sort().map(cat =>
    `<label class="cb-container"><input type="checkbox" value="${cat}" class="cat-checkbox"> ${cat}</label>`
  ).join('');

  const htmlString = `
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 15px; color: #333; }
        h2 { margin-top: 0; color: #1a73e8; }
        p { font-size: 13px; color: #555; }
        .scroll-box { max-height: 280px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; border-radius: 4px; margin-bottom: 15px; background: #f9f9f9; }
        .cb-container { display: flex; align-items: center; margin-bottom: 8px; font-size: 14px; cursor: pointer; }
        .cb-container input { margin-right: 10px; cursor: pointer; width: 16px; height: 16px; }
        button { width: 100%; padding: 12px; margin-top: 10px; border: none; border-radius: 4px; font-size: 14px; font-weight: bold; cursor: pointer; transition: 0.3s; }
        .btn-sync { background-color: #1a73e8; color: white; }
        .btn-sync:hover { background-color: #1152a8; }
        .btn-select { background-color: #e8f0fe; color: #1a73e8; border: 1px solid #1a73e8; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <h2>📱 Direct Contacts Sync</h2>
      <p>Select categories to upload directly to your Google Contacts. Labels will be created automatically based on the name prefix.</p>
      <button class="btn-select" onclick="selectAll()">✅ Select All / Deselect All</button>
      <div class="scroll-box">${checkboxesHtml}</div>
      <button id="runBtn" class="btn-sync" onclick="runSync()">🚀 Sync Checked Categories</button>
      <script>
        let allSelected = false;
        function selectAll() {
          allSelected = !allSelected;
          document.querySelectorAll('.cat-checkbox').forEach(cb => cb.checked = allSelected);
        }
        function runSync() {
          const checkboxes = document.querySelectorAll('.cat-checkbox:checked');
          const selectedCats = Array.from(checkboxes).map(cb => cb.value);
          if(selectedCats.length === 0) { alert('Please check at least one category!'); return; }
          const btn = document.getElementById('runBtn');
          btn.innerText = "⏳ Syncing... Please leave this open!";
          btn.disabled = true; btn.style.backgroundColor = "#999";
          google.script.run
            .withSuccessHandler(function() { google.script.host.close(); })
            .withFailureHandler(function(err) {
              alert("Error: " + err.message);
              btn.innerText = "🚀 Sync Checked Categories";
              btn.disabled = false; btn.style.backgroundColor = "#1a73e8";
            }).executeContactSync(selectedCats);
        }
      </script>
    </body>
  </html>
  `;
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(htmlString).setWidth(450).setHeight(600), 'Google Contacts Checkbox Sync');
}

function executeContactSync(selectedCategories) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.DATA_SHEET_NAME);
  if (!sheet) throw new Error("Sheet '" + CONFIG.DATA_SHEET_NAME + "' not found!");

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  var headers = data[0];
  var bNameIdx = headers.indexOf(CONFIG.COL_BROADCAST_NAME);
  var phoneIdx = headers.indexOf(CONFIG.COL_PHONE_NUMBER);
  var catIdx = headers.indexOf(CONFIG.COL_CATEGORY); 

  if (bNameIdx === -1 || phoneIdx === -1 || catIdx === -1) {
    throw new Error("Missing required columns. Check your CONFIG block.");
  }

  var syncIdx = headers.indexOf(CONFIG.COL_SYNC_TRACKER);
  if (syncIdx === -1) {
    syncIdx = headers.length;
    sheet.getRange(1, syncIdx + 1).setValue(CONFIG.COL_SYNC_TRACKER);
  }

  var groupCache = {};
  try {
    var groupsResponse = People.ContactGroups.list({pageSize: 1000});
    var existingGroups = groupsResponse.contactGroups || [];
    for (var g = 0; g < existingGroups.length; g++) {
      groupCache[existingGroups[g].name] = existingGroups[g].resourceName;
    }
  } catch (e) {
    throw new Error("Could not load Contact Groups. Did you remember to turn on the People API in Services? Error: " + e.message);
  }

  var count = 0;
  var startTime = new Date().getTime();

  for (var i = 1; i < data.length; i++) {
    // 4.5 Minute safe exit (Google times out scripts at 6 minutes)
    if (new Date().getTime() - startTime > 270000) {
      SpreadsheetApp.getUi().alert("Time Limit Reached! \n\nSynced " + count + " contacts in this batch.\nJust click 'Sync' again to instantly pick up exactly where it left off!");
      return;
    }

    var row = data[i];
    var category = row[catIdx] ? row[catIdx].toString().trim() : "";
    
    if (!selectedCategories.includes(category)) continue;

    var broadcastName = row[bNameIdx] ? row[bNameIdx].toString().trim() : "";
    var phone = row[phoneIdx] ? row[phoneIdx].toString().trim() : "";
    var isSynced = row[syncIdx];

    if (isSynced !== "Yes" && broadcastName !== "" && phone !== "") {
      
      var nameParts = broadcastName.split("_");
      var labelName = nameParts.length >= 2 ? (nameParts[0] + "_" + nameParts[1]) : "Unknown_Group";

      var groupId = groupCache[labelName];
      if (!groupId) {
        var newGroup = People.ContactGroups.create({ contactGroup: { name: labelName } });
        groupId = newGroup.resourceName; 
        groupCache[labelName] = groupId; 
      }

      var newContact = {
        names: [{ givenName: broadcastName }],
        phoneNumbers: [{ value: phone, type: "mobile" }],
        memberships: [{ contactGroupMembership: { contactGroupResourceName: groupId } }]
      };

      // --- SMART API PACING & RETRIES ---
      var success = false;
      var lastError = "";
      
      for (var retry = 0; retry < 3; retry++) {
        try {
          People.People.createContact(newContact);
          success = true;
          break; 
        } catch (e) {
          lastError = e.message.toLowerCase();
          if (lastError.includes("invalid") || lastError.includes("bad request")) {
            sheet.getRange(i + 1, syncIdx + 1).setValue("Error: Invalid Number");
            break; 
          }
          Utilities.sleep(2000 * (retry + 1)); 
        }
      }

      if (success) {
        sheet.getRange(i + 1, syncIdx + 1).setValue("Yes");
        Utilities.sleep(700); // Base pace to prevent API limits
        count++;
      } else if (!success && sheet.getRange(i + 1, syncIdx + 1).getValue() !== "Error: Invalid Number") {
        sheet.getRange(i + 1, syncIdx + 1).setValue("Error");
        throw new Error("API Connection throttled. Synced " + count + " contacts.\n\nError: " + lastError + "\n\nPlease wait 1 minute and hit Sync again.");
      }
    }
  }
  SpreadsheetApp.getUi().alert("✅ All Done! Successfully synced " + count + " contacts.");
}
