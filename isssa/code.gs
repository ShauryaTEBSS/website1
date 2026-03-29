// ==========================================
// INJASSS Master Backend & Portal Router
// ==========================================

const SPREADSHEET_ID = '1ZzHzJ8vdLV5osMc-DZ087xZrbuRPqWjNhzYjv_jpHj0'; 
const SHEET_NAME = 'Submissions'; 
const REVISION_SHEET = 'Revisions'; 
const MEMBER_SHEET = 'Members'; 
const PUBLICATION_SHEET = 'Publications'; // NEW: Separate sheet for finalized papers
const FOLDER_ID = '1Eyv3tBBybtbirFKSJ5kNPmd1tvCdP68o'; 

const WEB_APP_URL = 'https://shauryasingh.me/isssa/';

/**
 * 1. Web App Router (Serves HTML Pages)
 */
function doGet(e) {
  let page = e.parameter.page || 'admin'; 
  
  try {
    let template = HtmlService.createTemplateFromFile(page);
    return template.evaluate()
      .setTitle('INJASSS | ' + page.charAt(0).toUpperCase() + page.slice(1) + ' Portal')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (error) {
    return HtmlService.createHtmlOutput('<h1>404 - Page Not Found</h1><p>The requested portal page does not exist. Powered by @RTIX</p>');
  }
}

/**
 * 2. API Endpoint for incoming submissions & logins
 */
function doPost(e) {
  try {
    let data = JSON.parse(e.postData.contents);
    
    // ==========================================
    // 1A. INTERCEPT MEMBER LOGIN & ANALYTICS (NO FILES ATTACHED)
    // ==========================================
    if (data.formType === "memberLogin") {
      let sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(MEMBER_SHEET);
      let sheetData = sheet.getDataRange().getValues();
      
      if (sheetData.length <= 1) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, message: "No registered members found." }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      for (let i = 1; i < sheetData.length; i++) {
        let rowEmail = sheetData[i][5] ? sheetData[i][5].toString().trim().toLowerCase() : "";
        let rowPass = sheetData[i][6] ? sheetData[i][6].toString() : "";
        
        if (rowEmail === data.email.trim().toLowerCase()) {
          if (rowPass === data.password) {
            
            // --- NEW: Calculate Live Publications for Analytics ---
            let pubCount = 0;
            let subSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
            let subData = subSheet.getDataRange().getValues();
            for(let j = 1; j < subData.length; j++) {
              if(subData[j][4] && subData[j][4].toString().trim().toLowerCase() === rowEmail) {
                if(subData[j][12] && (subData[j][12].toString().includes("Accepted") || subData[j][12].toString().includes("Published"))) {
                  pubCount++;
                }
              }
            }
            
            let rawDocs = sheetData[i][14] ? sheetData[i][14].toString() : "[]";
            let parsedDocs = [];
            try { 
              parsedDocs = JSON.parse(rawDocs); 
            } catch(err) { 
              parsedDocs = []; 
            }

            return ContentService.createTextOutput(JSON.stringify({
              success: true, 
              data: {
                id: sheetData[i][1],
                tier: sheetData[i][2],
                name: sheetData[i][4],
                institution: sheetData[i][9],
                status: sheetData[i][13],
                publications: pubCount,
                assignedDocs: parsedDocs
              }
            })).setMimeType(ContentService.MimeType.JSON);
          } else {
            return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Incorrect password." }))
              .setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Email not found in membership records." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // 1B. INTERCEPT PROFILE UPDATES
    // ==========================================
    if (data.formType === "updateProfile") {
      let sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(MEMBER_SHEET);
      let sheetData = sheet.getDataRange().getValues();
      
      for (let i = 1; i < sheetData.length; i++) {
        if (sheetData[i][1] === data.memberId) { 
          sheet.getRange(i + 1, 5).setValue(data.name); // Updates Name in Col E
          sheet.getRange(i + 1, 10).setValue(data.institution); // Updates Inst in Col J
          return ContentService.createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Member ID not found." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // 1C. FETCH MEMBER DIRECTORY
    // ==========================================
    if (data.formType === "getDirectory") {
      let sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(MEMBER_SHEET);
      let sheetData = sheet.getDataRange().getValues();
      let directory = [];
      
      for (let i = 1; i < sheetData.length; i++) {
        if (sheetData[i][13] === "Active") { // Only load officially verified members
          directory.push({ 
            name: sheetData[i][4], 
            institution: sheetData[i][9], 
            tier: sheetData[i][2] 
          });
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, directory: directory }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // 1D. INITIATE UROPAY CHECKOUT (APC PAYMENTS)
    // ==========================================
    // ==========================================
    // 1D. INITIATE UROPAY CHECKOUT (APC PAYMENTS)
    // ==========================================
    if (data.formType === "initiateUroPay") {
      // 1. API Credentials
      const UROPAY_API_KEY = "ZYH9P9I479HF59CF"; 
      const UROPAY_SECRET = "LPYS5PKJISPK7R9XKSE9VDBEBG1LGE1RGH28R2JH6TBKTQ1YFA"; // <--- PUT YOUR UROPAY SECRET HERE
      
      // 2. Correct Endpoint from Docs
      const UROPAY_ENDPOINT = "https://api.uropay.me/order/generate"; 
      
      // 3. Create SHA-512 Hash of the Secret (Required by UroPay Authorization Header)
      const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_512, UROPAY_SECRET);
      let hashedSecret = '';
      for (let i = 0; i < rawHash.length; i++) {
        let hashVal = rawHash[i];
        if (hashVal < 0) hashVal += 256;
        if (hashVal.toString(16).length == 1) hashedSecret += '0';
        hashedSecret += hashVal.toString(16);
      }

      // 4. Payload Data
      const paymentPayload = {
        order_id: data.trackingId + "-" + Date.now(), 
        amount: data.amount,
        currency: "INR",
        description: "INJASSS APC - " + data.package,
        return_url: WEB_APP_URL + "?page=member" // Redirect back to Member Portal
      };

      try {
        // 5. Package Headers exactly as requested in documentation
        const options = {
          'method': 'post',
          'contentType': 'application/json',
          'headers': {
            'Accept': 'application/json',
            'X-API-KEY': UROPAY_API_KEY,
            'Authorization': 'Bearer ' + hashedSecret
          },
          'payload': JSON.stringify(paymentPayload),
          'muteHttpExceptions': true
        };
        
        const response = UrlFetchApp.fetch(UROPAY_ENDPOINT, options);
        const jsonResponse = JSON.parse(response.getContentText());

        // UroPay usually returns a payment_url or redirect_url
        if (jsonResponse.status === true || jsonResponse.payment_url) {
          return ContentService.createTextOutput(JSON.stringify({ 
            success: true, 
            paymentUrl: jsonResponse.payment_url // Adjust this variable based on exact UroPay response if needed
          })).setMimeType(ContentService.MimeType.JSON);
        } else {
          return ContentService.createTextOutput(JSON.stringify({ 
            success: false, 
            message: "UroPay API Error: " + JSON.stringify(jsonResponse)
          })).setMimeType(ContentService.MimeType.JSON);
        }

      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ 
          success: false, 
          message: "Server Connection Failed: " + err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }


    // ==========================================
    // 2. PROCESS FILE UPLOADS (Register, Submit, Re-upload)
    // ==========================================
    let fileBlob = Utilities.newBlob(Utilities.base64Decode(data.fileData), data.mimeType, data.fileName);
    let folder = DriveApp.getFolderById(FOLDER_ID);
    let savedFile = folder.createFile(fileBlob);
    let fileUrl = savedFile.getUrl();
    
    // ==========================================
    // INTERCEPT MEMBERSHIP REGISTRATIONS
    // ==========================================
    if (data.formType === "register") {
      let memSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(MEMBER_SHEET);
      let lastRow = memSheet.getLastRow();
      let idNum = lastRow === 0 ? 1 : lastRow;
      let memberId = "ISSSA-" + new Date().getFullYear() + "-M" + ("000" + idNum).slice(-3);
      
      memSheet.appendRow([
        new Date().toLocaleString(), 
        memberId, 
        data.tier, 
        data.amount, 
        data.name, 
        data.email, 
        data.password, 
        data.phone, 
        data.designation, 
        data.institution, 
        data.address, 
        data.utr, 
        fileUrl, 
        "Payment Verification Pending"
      ]);
      
      try {
        let content = `
          <p>Dear ${data.name},</p>
          <p>Thank you for submitting your application to join the International Social Sciences Studies Association.</p>
          <p>We have successfully received your registration details and your payment proof (UTR: <strong>${data.utr}</strong>) for the <strong>${data.tier}</strong> tier.</p>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;"><strong>Status:</strong> Awaiting Treasury Verification.</p>
            <p style="margin: 5px 0 0 0; font-size: 13px;">Our treasury team is verifying your payment realization. This usually takes 2-3 business days. You will receive another email once your membership is activated.</p>
          </div>
        `;
        let confirmHtml = buildEmailTemplate("Membership Application Received", content);
        GmailApp.sendEmail(data.email, `Application Received: ISSSA Membership`, "", {htmlBody: confirmHtml, name: "ISSSA Treasury"});
        
        let adminContent = `<p>A new membership application (${data.tier}) has been submitted by ${data.name}. Please check the Google Sheet to verify payment UTR: ${data.utr}.</p>`;
        GmailApp.sendEmail(Session.getActiveUser().getEmail(), "New ISSSA Member Registration", "", {htmlBody: buildEmailTemplate("New Registration", adminContent), name: "System Alert"});
      } catch(err) {
        console.error("Registration email failed: ", err);
      }
      
      return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // INTERCEPT RE-UPLOADS
    // ==========================================
    if (data.formType === "reupload") {
      let revSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(REVISION_SHEET);
      revSheet.appendRow([
        new Date().toLocaleString(), 
        data.trackingId, 
        data.authorEmail, 
        fileUrl, 
        data.authorComments, 
        "Revision Submitted"
      ]);
      
      let mainSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
      let mainData = mainSheet.getDataRange().getValues();
      for(let i = 1; i < mainData.length; i++) {
        if(mainData[i][1] === data.trackingId) {
          mainSheet.getRange(i+1, 13).setValue("Revision Submitted"); 
          break;
        }
      }
      
      try {
        let content = `
          <p>Dear Author,</p>
          <p>We have successfully received the revised manuscript for Tracking ID: <strong>${data.trackingId}</strong>.</p>
          <p>Your updated document and author comments have been logged and will now be routed back to the editorial board for re-evaluation.</p>
          <p>We will notify you once the final editorial decision is made.</p>
        `;
        let confirmHtml = buildEmailTemplate("Revision Successfully Logged", content);
        GmailApp.sendEmail(data.authorEmail, `Revision Received: ${data.trackingId} - INJASSS`, "", {htmlBody: confirmHtml, name: "INJASSS Editorial Board"});
      } catch(err) {}
      
      return ContentService.createTextOutput(JSON.stringify({"status": "success", "id": data.trackingId}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // STANDARD INITIAL SUBMISSION
    // ==========================================
    let sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    let lastRow = sheet.getLastRow();
    let idNumber = lastRow === 0 ? 1 : lastRow; 
    let trackingId = "INJASSS-" + new Date().getFullYear() + "-" + ("000" + idNumber).slice(-3);
    
    sheet.appendRow([
      new Date().toLocaleString(), trackingId, data.volumeIssue, data.authorName, data.authorEmail, 
      data.authorPhone, data.authorInstitution, data.paperTitle, data.paperDomain, 
      data.paperKeywords, data.paperAbstract, fileUrl, "Pending Review"
    ]);

    try {
      let content = `
        <p>Dear ${data.authorName},</p>
        <p>Thank you for submitting your manuscript titled "<strong>${data.paperTitle}</strong>" to the Indian National Journal of Advanced Social Science Studies.</p>
        
        <div style="background-color: #f0f4f8; border-left: 4px solid #002b5e; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 13px; color: #555; text-transform: uppercase;">Official Tracking ID:</p>
            <h3 style="margin: 5px 0 0 0; color: #002b5e; letter-spacing: 1px;">${trackingId}</h3>
        </div>

        <p>You can track the live editorial status of your submission at any time by logging into our secure author tracking portal.</p>
        
        <div style="text-align: center; margin-top: 30px;">
            <a href="${WEB_APP_URL}authorportal.html" style="display: inline-block; padding: 12px 30px; background-color: #002b5e; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold;">Go to Tracking Portal</a>
        </div>
      `;
      let authorEmailHtml = buildEmailTemplate("Manuscript Received", content);
      GmailApp.sendEmail(data.authorEmail, `Submission Received: ${trackingId} - INJASSS`, "", {htmlBody: authorEmailHtml, name: "INJASSS Editorial Board"});
    } catch(emailErr) {}
    
    return ContentService.createTextOutput(JSON.stringify({"status": "success", "id": trackingId}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 3. Data Fetcher for the Admin Dashboard
 */
function getSubmissionsData() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow <= 1) return []; 
  
  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map((row, index) => {
    let obj = { rowNumber: index + 2 }; 
    headers.forEach((header, i) => {
      let cellValue = row[i];
      if (cellValue instanceof Date) {
        obj[header] = cellValue.toLocaleString(); 
      } else {
        obj[header] = cellValue;
      }
    });
    return obj;
  }).reverse(); 
}

/**
 * 4. Status Updater (Triggered by Admin)
 */
function updateSubmissionStatus(rowNumber, newStatus) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  sheet.getRange(rowNumber, 13).setValue(newStatus);
  
  let trackingId = sheet.getRange(rowNumber, 2).getValue(); 
  let authorName = sheet.getRange(rowNumber, 4).getValue(); 
  let authorEmail = sheet.getRange(rowNumber, 5).getValue(); 
  let paperTitle = sheet.getRange(rowNumber, 8).getValue(); 

  // --- ADMIN EMAIL TRIGGERS ---
  try {
    if (newStatus === "Accepted" && authorEmail) {
      let content = `
        <p>Dear ${authorName},</p>
        <p>We are delighted to inform you that your manuscript "<strong>${paperTitle}</strong>" (Tracking ID: ${trackingId}) has successfully passed our double-blind peer-review process and has been formally <strong style="color: #155724;">Accepted</strong> for publication in INJASSS.</p>
        <p>The editorial desk will contact you shortly regarding the next steps for typesetting, formatting, and final publication schedules.</p>
      `;
      let accHtml = buildEmailTemplate("Manuscript Accepted", content);
      GmailApp.sendEmail(authorEmail, `Accepted: ${trackingId} - INJASSS`, "", {htmlBody: accHtml, name: "INJASSS Editor"});
    } 
    else if (newStatus === "Rejected" && authorEmail) {
      let content = `
        <p>Dear ${authorName},</p>
        <p>Thank you for submitting your work to INJASSS.</p>
        <p>After careful evaluation by our advisory council, we regret to inform you that your manuscript (Tracking ID: <strong>${trackingId}</strong>) has been <strong style="color: #721c24;">Rejected</strong> and will not be published.</p>
        <p>You may log in to the tracking portal to view the specific academic feedback provided by the reviewers.</p>
      `;
      let rejHtml = buildEmailTemplate("Editorial Decision", content);
      GmailApp.sendEmail(authorEmail, `Decision on ${trackingId} - INJASSS`, "", {htmlBody: rejHtml, name: "INJASSS Editor"});
    }
    else if (newStatus.includes("Under Review")) {
      const reviewersMap = {
        "Prof. P. Nag": "pnag@injasss.org",
        "Prof. A.R. Siddiqui": "arsiddiqui@injasss.org",
        "Prof. Haushila Prasad": "hprasad@injasss.org",
        "Prof. D. K. Singh": "dksingh@injasss.org",
        "tebssofficial": "tebssofficial@gmail.com"
      };

      let assignedEmail = null;
      let profName = "";
      
      for (let name in reviewersMap) {
        if (newStatus.includes(name)) {
          assignedEmail = reviewersMap[name];
          profName = name;
          break;
        }
      }

      if (assignedEmail) {
        let content = `
          <p>Dear ${profName},</p>
          <p>A new manuscript has been securely assigned to your portal for double-blind peer review.</p>
          
          <div style="background-color: #f0f4f8; border-left: 4px solid #f4a261; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Tracking ID:</strong> ${trackingId}</p>
            <p style="margin: 5px 0 0 0;"><strong>Title:</strong> ${paperTitle}</p>
          </div>

          <p>Please log in to your secure Reviewer Dashboard to download the document and submit your editorial decision.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${WEB_APP_URL}reviewerportal.html" style="display: inline-block; padding: 12px 30px; background-color: #f4a261; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold;">Access Reviewer Portal</a>
          </div>
        `;
        let revEmailHtml = buildEmailTemplate("New Manuscript Assignment", content);
        GmailApp.sendEmail(assignedEmail, `Review Required: ${trackingId}`, "", {htmlBody: revEmailHtml, name: "INJASSS Admin"});
      }
    }
  } catch(emailErr) {
    console.error("Admin alert email failed: ", emailErr);
  }

  return "Status updated successfully!";
}

/**
 * Setup function
 */
function setupDatabase() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  let sheet1 = ss.getSheetByName(SHEET_NAME);
  if (!sheet1) sheet1 = ss.insertSheet(SHEET_NAME);
  const h1 = ["Timestamp", "Tracking ID", "Volume/Issue", "Author Name", "Email", "Phone", "Institution", "Paper Title", "Domain", "Keywords", "Abstract", "Manuscript Link", "Review Status", "Reviewer Comments"];
  sheet1.getRange(1, 1, 1, h1.length).setValues([h1]);

  let sheet2 = ss.getSheetByName(REVISION_SHEET);
  if (!sheet2) sheet2 = ss.insertSheet(REVISION_SHEET);
  const h2 = ["Timestamp", "Tracking ID", "Email", "Revised Manuscript Link", "Author Comments", "Status"];
  sheet2.getRange(1, 1, 1, h2.length).setValues([h2]);

  let sheet3 = ss.getSheetByName(MEMBER_SHEET);
  if (!sheet3) sheet3 = ss.insertSheet(MEMBER_SHEET);
  const h3 = ["Timestamp", "Member ID", "Tier", "Amount", "Name", "Email", "Password", "Phone", "Designation", "Institution", "Address", "UTR", "Payment Proof", "Status", "Assigned Documents"];
  sheet3.getRange(1, 1, 1, h3.length).setValues([h3]);

  // NEW: Setup Publications Sheet
  let sheet4 = ss.getSheetByName(PUBLICATION_SHEET);
  if (!sheet4) sheet4 = ss.insertSheet(PUBLICATION_SHEET);
  const h4 = ["Timestamp", "Tracking ID", "Volume/Issue", "Author Name", "Email", "Paper Title", "Manuscript Link", "DOI", "Date Published"];
  sheet4.getRange(1, 1, 1, h4.length).setValues([h4]);
}

/**
 * 5. Authenticate Reviewer Login
 */
function authenticateReviewer(email, password) {
  const reviewers = {
    "pnag@injasss.org": { name: "Prof. P. Nag", pass: "review2026" },
    "arsiddiqui@injasss.org": { name: "Prof. A.R. Siddiqui", pass: "review2026" },
    "hprasad@injasss.org": { name: "Prof. Haushila Prasad", pass: "review2026" },
    "dksingh@injasss.org": { name: "Prof. D. K. Singh", pass: "review2026" },
    "tebssofficial@gmail.com": { name: "tebssofficial", pass: "review2026" }
  };
  
  if (reviewers[email] && reviewers[email].pass === password) {
    return { success: true, name: reviewers[email].name };
  }
  return { success: false, message: "Invalid email or password. Please contact the Editor." };
}

/**
 * 6. Fetch Only Assigned Submissions for Reviewer
 */
function getAssignedSubmissions(reviewerName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow <= 1) return []; 
  
  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = data[0];
  const rows = data.slice(1);
  let assignedPapers = [];
  
  rows.forEach((row, index) => {
    let statusText = row[12] ? row[12].toString() : ""; 
    
    if (statusText.includes(reviewerName)) {
      let obj = { rowNumber: index + 2 }; 
      headers.forEach((header, i) => {
        let cellValue = row[i];
        if (cellValue instanceof Date) {
          obj[header] = cellValue.toLocaleString(); 
        } else {
          obj[header] = cellValue;
        }
      });
      assignedPapers.push(obj);
    }
  });
  
  return assignedPapers.reverse(); 
}

/**
 * 7. Save Peer Review Decision
 */
function submitPeerReview(rowNumber, decision, comments) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  
  sheet.getRange(rowNumber, 13).setValue("Reviewed: " + decision); 
  sheet.getRange(rowNumber, 14).setValue(comments); 

  try {
    let trackingId = sheet.getRange(rowNumber, 2).getValue(); 
    let authorName = sheet.getRange(rowNumber, 4).getValue(); 
    let authorEmail = sheet.getRange(rowNumber, 5).getValue(); 

    if (authorEmail) {
      let isRevision = decision.includes("Revisions Required");
      let actionText = "";
      
      if (isRevision) {
        actionText = `
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-weight: bold;">Action Required: The reviewers have requested revisions.</p>
          </div>
          <p>Please log in to the tracking portal to read the detailed academic feedback, update your document accordingly, and submit it through the secure Re-Upload Portal.</p>
          <div style="text-align: center; margin-top: 30px;">
              <a href="${WEB_APP_URL}reupload.html" style="display: inline-block; padding: 12px 30px; background-color: #d32f2f; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold;">Go to Re-Upload Portal</a>
          </div>
        `;
      } else {
        actionText = `
          <p>Please log in to the Author Tracking Portal using your email address and tracking ID to view the final editorial decision and download your academic feedback.</p>
          <div style="text-align: center; margin-top: 30px;">
              <a href="${WEB_APP_URL}authorportal.html" style="display: inline-block; padding: 12px 30px; background-color: #002b5e; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold;">View Editorial Decision</a>
          </div>
        `;
      }

      let content = `
        <p>Dear ${authorName},</p>
        <p>The peer-review evaluation for your manuscript bearing Tracking ID (<strong>${trackingId}</strong>) has been successfully completed by our advisory council.</p>
        ${actionText}
      `;
      let decisionHtml = buildEmailTemplate("Peer Review Completed", content);
      GmailApp.sendEmail(authorEmail, `Status Update for ${trackingId} - INJASSS`, "", {htmlBody: decisionHtml, name: "INJASSS Editorial Board"});
    }
  } catch(emailErr) {
    console.error("Author decision alert email failed: ", emailErr);
  }
  
  return "Review submitted successfully!";
}

/**
 * 8. Fetch Paper Status for Author
 */
function getPaperStatus(trackingId, email) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return { success: false, message: "Database is currently empty." };
  
  for (let i = 1; i < data.length; i++) {
    let rowId = data[i][1] ? data[i][1].toString().trim() : "";
    let rowEmail = data[i][4] ? data[i][4].toString().trim() : "";
    
    if (rowId === trackingId.trim() && rowEmail.toLowerCase() === email.trim().toLowerCase()) {
      return {
        success: true,
        volumeIssue: data[i][2], 
        title: data[i][7],       
        status: data[i][12] || "Pending Review", 
        comments: data[i][13] || "No feedback has been recorded yet." 
      };
    }
  }
  
  return { success: false, message: "No manuscript found matching that Tracking ID and Email combination." };
}

/**
 * --- MASTER EMAIL DESIGN TEMPLATE ---
 */
function buildEmailTemplate(mainTitle, bodyContent) {
  return `
    <div style="background-color: #f4f6f9; padding: 30px 15px; font-family: 'Open Sans', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        
        <div style="background-color: #002b5e; padding: 30px 20px; text-align: center; border-bottom: 5px solid #f4a261;">
          <h1 style="margin: 0; color: #ffffff; font-family: 'Merriweather', 'Times New Roman', serif; font-size: 36px; letter-spacing: 2px;">ISSSA</h1>
          <h3 style="margin: 5px 0 0 0; color: #f4a261; font-family: 'Merriweather', 'Times New Roman', serif; font-size: 16px; font-weight: normal; letter-spacing: 3px;">INJASSS EDITORIAL</h3>
        </div>
        
        <div style="padding: 35px 30px; color: #444444; line-height: 1.7; font-size: 15px;">
          <h2 style="color: #002b5e; margin-top: 0; margin-bottom: 20px; font-family: 'Merriweather', 'Times New Roman', serif; font-size: 22px; border-bottom: 1px solid #eeeeee; padding-bottom: 10px;">${mainTitle}</h2>
          ${bodyContent}
        </div>
        
        <div style="background-color: #f8f9fa; padding: 25px 20px; text-align: center; border-top: 1px solid #eeeeee; font-size: 12px; color: #888888; line-height: 1.5;">
          <p style="margin: 0; font-weight: bold; color: #555555;">International Social Sciences Studies Association</p>
          <p style="margin: 5px 0 0 0;">Varanasi, Uttar Pradesh, India</p>
          <p style="margin: 15px 0 0 0; font-style: italic;">This is an automated system message generated by the INJASSS portal. Please do not reply directly to this email.</p>
        </div>

      </div>
    </div>
  `;
}

function forceEmailAuth() {
  GmailApp.sendEmail(Session.getActiveUser().getEmail(), "INJASSS Auth Test", "If you receive this, the email system is authorized and working!");
}

/**
 * 10. Fetch Member Data for Admin Dashboard
 */
function getMembersData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(MEMBER_SHEET); 
    
    if (!sheet) {
      let allSheets = ss.getSheets();
      for (let i = 0; i < allSheets.length; i++) {
        let currentName = allSheets[i].getName().toLowerCase();
        if (currentName.includes("sheet3")) {
          allSheets[i].setName(MEMBER_SHEET);
          sheet = allSheets[i];
          break;
        }
      }
    }
    
    if (!sheet) {
      throw new Error("Cannot find the Members or Sheet3 tab in your Google Sheet.");
    }

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    if (lastRow <= 1) return []; 
    
    const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    const headers = data[0]; 
    const rows = data.slice(1);
    
    return rows.map((row, index) => {
      let obj = { rowNumber: index + 2 }; 
      headers.forEach((header, i) => {
        let cellValue = row[i];
        obj[header] = (cellValue instanceof Date) ? cellValue.toLocaleString() : cellValue;
      });
      return obj;
    }).reverse(); 
    
  } catch (error) {
    throw new Error(error.toString()); 
  }
}

/**
 * 11. Update Member Status (Triggered by Admin Verifying Payment)
 */
function updateMemberStatus(rowNumber, newStatus) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(MEMBER_SHEET);
  
  sheet.getRange(rowNumber, 14).setValue(newStatus); 
  
  if (newStatus === 'Active') {
    try {
      let memberId = sheet.getRange(rowNumber, 2).getValue();
      let memberName = sheet.getRange(rowNumber, 5).getValue();
      let memberEmail = sheet.getRange(rowNumber, 6).getValue();
      
      let content = `
        <p>Dear ${memberName},</p>
        <p>Your payment has been successfully verified by the treasury. Welcome to the International Social Sciences Studies Association (ISSSA)!</p>
        
        <div style="background-color: #f0f4f8; border-left: 4px solid #002b5e; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 13px; color: #555; text-transform: uppercase;">Official Member ID:</p>
            <h3 style="margin: 5px 0 0 0; color: #002b5e; letter-spacing: 1px;">${memberId}</h3>
        </div>
        
        <p>Your Member Dashboard is now fully unlocked. You can access priority submission pipelines, download your digital ID card, and view your electoral eligibility.</p>
        
        <div style="text-align: center; margin-top: 30px;">
            <a href="${WEB_APP_URL}member.html" style="display: inline-block; padding: 12px 30px; background-color: #002b5e; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold;">Login to Member Portal</a>
        </div>
      `;
      let emailHtml = buildEmailTemplate("Membership Activated", content);
      GmailApp.sendEmail(memberEmail, `Membership Activated: ${memberId}`, "", {htmlBody: emailHtml, name: "ISSSA Treasury"});
    } catch(e) {
      console.error("Welcome email failed: " + e);
    }
  }
  
  return "Member verified!";
}

/**
 * 12. Assign secure document link to a member
 */
function assignDocumentToMember(rowNumber, docTitle, docUrl) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(MEMBER_SHEET);
  let currentDocsRaw = sheet.getRange(rowNumber, 15).getValue();
  let docsArray = [];
  if (currentDocsRaw) {
    try { docsArray = JSON.parse(currentDocsRaw); } catch(e) { docsArray = []; }
  }
  
  docsArray.push({
    title: docTitle,
    url: docUrl,
    date: new Date().toLocaleDateString()
  });
  
  sheet.getRange(rowNumber, 15).setValue(JSON.stringify(docsArray));
  return "Document assigned successfully!";
}


// ==========================================
// 13. MASTER PUBLICATION DESK LOGIC
// ==========================================

/**
 * Fetch only Accepted or Published papers for the Admin Publication Desk
 */
function getAcceptedPapers() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  let accepted = [];
  const headers = data[0];
  
  for(let i = 1; i < data.length; i++) {
    let status = data[i][12] ? data[i][12].toString() : "";
    if(status.includes("Accepted") || status.includes("Published")) {
      let obj = { rowNumber: i + 1 };
      headers.forEach((header, colIndex) => {
        obj[header] = (data[i][colIndex] instanceof Date) ? data[i][colIndex].toLocaleString() : data[i][colIndex];
      });
      // Try to fetch DOI if it was saved in Column 15 previously
      obj['DOI'] = data[i][14] || "Pending DOI"; 
      accepted.push(obj);
    }
  }
  return accepted.reverse();
}

/**
 * Finalize Publication, Move to Publications Sheet, Assign DOI, and Email Author
 */
function publishPaper(rowNumber, finalIssue, doi, authorEmail, authorName, paperTitle) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const subSheet = ss.getSheetByName(SHEET_NAME);
  const pubSheet = ss.getSheetByName(PUBLICATION_SHEET);
  
  // 1. Update original Submissions sheet
  subSheet.getRange(rowNumber, 3).setValue(finalIssue); // Update Issue
  subSheet.getRange(rowNumber, 13).setValue("Published"); // Update Status
  subSheet.getRange(rowNumber, 15).setValue(doi); // Save DOI in Col 15 (O)

  // Fetch the tracking ID and manuscript link from the submission row
  let trackingId = subSheet.getRange(rowNumber, 2).getValue();
  let docLink = subSheet.getRange(rowNumber, 12).getValue();

  // 2. Add to the new isolated "Publications" sheet
  pubSheet.appendRow([
    new Date().toLocaleString(),
    trackingId,
    finalIssue,
    authorName,
    authorEmail,
    paperTitle,
    docLink,
    doi,
    new Date().toLocaleDateString()
  ]);

  // 3. Send Official Publication Email
  try {
    let content = `
      <p>Dear ${authorName},</p>
      <p>Congratulations! We are thrilled to inform you that the typesetting and formatting for your manuscript "<strong>${paperTitle}</strong>" are complete, and your work has been officially published.</p>
      
      <div style="background-color: #f0f4f8; border-left: 4px solid #002b5e; padding: 15px; margin: 20px 0;">
          <p style="margin: 0 0 5px 0; font-size: 13px; text-transform: uppercase; color: #555;">Publication Details:</p>
          <p style="margin: 0 0 5px 0;"><strong>Edition:</strong> ${finalIssue}</p>
          <p style="margin: 0;"><strong>Official DOI:</strong> <a href="https://doi.org/${doi}" style="color: #d32f2f; font-weight: bold;">${doi}</a></p>
      </div>
      
      <p>Your research is now available to the global academic community. You may log in to your Member Dashboard to securely generate citations for your newly published work.</p>
      <p>Thank you for contributing to the advancement of social sciences.</p>
    `;
    let emailHtml = buildEmailTemplate("Manuscript Published", content);
    GmailApp.sendEmail(authorEmail, `Published: ${paperTitle} - INJASSS`, "", {htmlBody: emailHtml, name: "INJASSS Editorial Board"});
  } catch(e) {
    console.error("Publication email failed: " + e);
  }
  
  return "Paper successfully published, archived, and author notified!";
}
function forceNetworkAuth() {
    UrlFetchApp.fetch("https://google.com");
    }
