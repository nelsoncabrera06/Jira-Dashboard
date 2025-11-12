const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const NOTES_FILE = path.join(__dirname, 'notes.json');
const SCHEDULED_FILE = path.join(__dirname, 'scheduled.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuración de Jira
const JIRA_URL = 'https://relexsolutions.atlassian.net';
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

// Funciones para manejar notas
function readNotes() {
    try {
        if (fs.existsSync(NOTES_FILE)) {
            const data = fs.readFileSync(NOTES_FILE, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error('Error reading notes:', error);
        return {};
    }
}

function writeNotes(notes) {
    try {
        fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error writing notes:', error);
        return false;
    }
}

// Funciones para manejar fechas scheduled
function readScheduled() {
    try {
        if (fs.existsSync(SCHEDULED_FILE)) {
            const data = fs.readFileSync(SCHEDULED_FILE, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error('Error reading scheduled dates:', error);
        return {};
    }
}

function writeScheduled(scheduled) {
    try {
        fs.writeFileSync(SCHEDULED_FILE, JSON.stringify(scheduled, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error writing scheduled dates:', error);
        return false;
    }
}

// Endpoint para obtener issues
app.get('/api/issues', async (req, res) => {
    try {
        const response = await axios.get(`${JIRA_URL}/rest/api/3/search/jql`, {
            params: {
                jql: 'assignee=currentUser() AND status!=Done AND status!=Declined AND status!=Closed AND status!=Canceled AND status!=Resolved',
                maxResults: 50,
                fields: 'key,summary,status,priority,assignee,created,updated,issuetype,parent,customfield_10014,duedate'
            },
            auth: {
                username: JIRA_EMAIL,
                password: JIRA_API_TOKEN
            },
            headers: {
                'Accept': 'application/json'
            }
        });

        // Formatear la respuesta
        const issues = response.data.issues.map(issue => ({
            key: issue.key,
            summary: issue.fields.summary,
            status: issue.fields.status.name,
            priority: issue.fields.priority ? issue.fields.priority.name : 'None',
            issueType: issue.fields.issuetype.name,
            created: issue.fields.created,
            updated: issue.fields.updated,
            duedate: issue.fields.duedate || null,
            url: `${JIRA_URL}/browse/${issue.key}`,
            parentKey: issue.fields.parent ? issue.fields.parent.key : null,
            epicLink: issue.fields.customfield_10014 || null
        }));

        res.json({
            total: response.data.total,
            issues: issues
        });

    } catch (error) {
        console.error('Error fetching Jira issues:', error.message);
        res.status(500).json({
            error: 'Error al obtener issues de Jira',
            details: error.response ? error.response.data : error.message
        });
    }
});

// Endpoint para obtener notas
app.get('/api/notes', (req, res) => {
    try {
        const notes = readNotes();
        res.json({ notes });
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({
            error: 'Error al obtener notas',
            details: error.message
        });
    }
});

// Endpoint para guardar notas
app.post('/api/notes', (req, res) => {
    try {
        const { notes } = req.body;

        if (!notes || typeof notes !== 'object') {
            return res.status(400).json({
                error: 'Invalid notes format'
            });
        }

        const success = writeNotes(notes);

        if (success) {
            res.json({
                success: true,
                message: 'Notes saved successfully'
            });
        } else {
            res.status(500).json({
                error: 'Failed to save notes'
            });
        }
    } catch (error) {
        console.error('Error saving notes:', error);
        res.status(500).json({
            error: 'Error al guardar notas',
            details: error.message
        });
    }
});

// Endpoint para obtener fechas scheduled
app.get('/api/scheduled', (req, res) => {
    try {
        const scheduled = readScheduled();
        res.json({ scheduled });
    } catch (error) {
        console.error('Error fetching scheduled dates:', error);
        res.status(500).json({
            error: 'Error al obtener fechas scheduled',
            details: error.message
        });
    }
});

// Endpoint para guardar fechas scheduled
app.post('/api/scheduled', (req, res) => {
    try {
        const { scheduled } = req.body;

        if (!scheduled || typeof scheduled !== 'object') {
            return res.status(400).json({
                error: 'Invalid scheduled format'
            });
        }

        const success = writeScheduled(scheduled);

        if (success) {
            res.json({
                success: true,
                message: 'Scheduled dates saved successfully'
            });
        } else {
            res.status(500).json({
                error: 'Failed to save scheduled dates'
            });
        }
    } catch (error) {
        console.error('Error saving scheduled dates:', error);
        res.status(500).json({
            error: 'Error al guardar fechas scheduled',
            details: error.message
        });
    }
});

// Endpoint de salud
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Jira Dashboard API está funcionando' });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
