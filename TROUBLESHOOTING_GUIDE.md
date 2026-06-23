# 🛠️ Healtheon UI - Tips, Tricks & Troubleshooting

## 💡 Pro Tips for Using the System

### Dashboard Tips
1. **Auto-refresh Active**: Cases update every 5 seconds automatically
2. **Demo Data**: Click "Load Demo Case" to quickly populate the form
3. **Live Monitoring**: "LIVE AGENT MONITORING" badge appears when cases are processing
4. **Quick Navigation**: Click any case card to jump to its detail view
5. **Case Sorting**: Cases displayed newest-first by default

### Patient Form Tips
1. **Only Chief Complaint Required**: Other fields are optional
2. **Severity Matters**: Higher severity triggers more urgent analysis
3. **Pre-filled Form**: If you load a demo, you can edit before submitting
4. **Clear Button**: Resets form to empty state for new submission
5. **Form Validation**: Error messages appear below form if submit fails

### Case Detail Tips
1. **Live Transcript**: Refreshes every 4 seconds automatically
2. **Scroll Auto-lock**: Transcript scrolls to latest message
3. **Markdown Rendering**: Agent responses support tables, code blocks, lists
4. **Thinking Timeline**: Shows which agent is currently thinking
5. **Synthetic Vitals**: Adjust severity to see different vital sign ranges
6. **Approve Button**: Appears when case completes (status = DONE)
7. **Rerun Button**: Available if case fails, clears old data and restarts

### Patient Record Tips
1. **Timeline View**: Easier to read than transcript for long cases
2. **Vital Signs**: Pulse effect on panel indicates critical values
3. **Color Coding**: Red=critical, Amber=elevated, Normal=safe
4. **Pathology Table**: Shows biomarker results with reference ranges
5. **Agent Avatars**: Colored icons identify which agent is speaking

### System Orchestration Tips
1. **Temperature Setting**: Lower (0.1) = precise, Higher (1.0) = creative
2. **Model Switching**: Change LLM model for different AI providers
3. **API Key**: Keep masked, only copy if needed to export
4. **2FA Toggle**: Enable for production use
5. **Color Scheme**: 5 accent colors available to match preferences

### Agent Fleet Tips
1. **System Prompt**: Edit here to change agent behavior
2. **Temperature per Agent**: Can adjust individual agent creativity
3. **Tools/Capabilities**: Check what functions each agent can use
4. **Safety Level**: Strict (educational), Moderate (research), Lenient (dev)
5. **Consensus Threshold**: Higher = stricter agreement needed (85% default)
6. **Max Debate Rounds**: More rounds = longer processing, better consensus

### Case Analytics Tips
1. **Confidence Score**: 94%+ indicates strong case matching
2. **Consensus Delta**: Shows if agents agree on diagnosis
3. **Historical Archive**: Similar past cases for reference
4. **Match Percentage**: Highest = most similar to current case
5. **Synthesis Engine**: Summary of AI consensus & key findings

---

## 🐛 Troubleshooting Guide

### Issue: "Cannot reach backend. Is it running?"

**Symptoms**:
- Error message on Dashboard
- Cases won't load
- Can't submit new case

**Solutions**:
1. Check if backend is running
   ```bash
   curl http://localhost:8000/health
   # Should return: {"status": "ok"}
   ```

2. Start backend if not running
   ```bash
   cd backend
   uvicorn backend.main:app --reload --port 8000
   ```

3. Check port 8000 is free
   ```bash
   # Windows
   netstat -ano | findstr :8000
   # If in use, kill process or use different port
   ```

4. Verify environment variables
   ```bash
   # Check .env file exists
   cat backend/.env
   ```

5. Check CORS settings
   - Ensure frontend URL is in CORS_ORIGINS
   - Default: http://localhost:5173

---

### Issue: Form submission hangs or times out

**Symptoms**:
- "Launching Agents..." spinner never stops
- Form stays disabled
- No error message

**Solutions**:
1. Check backend is running (see above)
2. Check API response time
   ```bash
   curl -X POST http://localhost:8000/api/cases \
     -H "Content-Type: application/json" \
     -d '{"chief_complaint":"test"}'
   # Should return 202 immediately
   ```

3. Check browser console for errors
   - F12 → Console tab
   - Look for Axios error messages

4. Retry submission
   - Wait 10 seconds
   - Try again
   - Try smaller form (just chief complaint)

---

### Issue: Case Detail page won't load or shows "processing" forever

**Symptoms**:
- Page loads but shows spinner indefinitely
- Transcript never appears
- Status stays "processing" for >10 minutes

**Solutions**:
1. Check case ID in URL is valid
   ```bash
   # Should show case data
   curl http://localhost:8000/api/cases/{case_id}
   ```

2. Check backend logs for errors
   - Look for exceptions or stack traces
   - Pipeline may have crashed silently

3. Try rerun pipeline
   - Click "Rerun Pipeline" button
   - Clears old data and restarts

4. Check database integrity
   ```bash
   # Verify database file exists
   ls -la backend/../healtheon.db
   ```

5. Restart both services
   ```bash
   # Kill backend
   # Kill frontend  
   # Run again: npm run dev
   ```

---

### Issue: Agent transcript shows only one message

**Symptoms**:
- Only Intake Agent message visible
- No responses from other agents
- Case finishes with only 1-2 messages

**Solutions**:
1. Check LLM provider is working
   - If using OpenAI: Verify API key is valid
   - If using Ollama: Verify ollama serve is running

2. Check model specified is available
   ```bash
   # For Ollama
   ollama list  # Should show installed models
   ```

3. Check backend logs for LLM errors
   - API rate limits?
   - Authentication failed?
   - Model not found?

4. Verify .env configuration
   ```bash
   # Check these are set correctly:
   LLM_PROVIDER=openai  # or ollama
   OPENAI_API_KEY=sk-...  # if using OpenAI
   OLLAMA_BASE_URL=http://localhost:11434/v1  # if using Ollama
   ```

5. Test LLM directly
   ```bash
   # Test OpenAI API
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   
   # Test Ollama
   curl http://localhost:11434/api/tags
   ```

---

### Issue: Vitals not updating or showing zero values

**Symptoms**:
- Vital signs display 0 or blank
- Heart rate, BP not changing
- No dynamic updates

**Solutions**:
1. Refresh page
   - Vitals calculated on component load
   - F5 or Ctrl+R to refresh

2. Check severity value in case
   - Vitals based on severity score
   - Higher severity = higher vitals
   - If severity=0, vitals may appear low

3. Clear browser cache
   - DevTools → Application → Clear storage

---

### Issue: Dashboard loads but shows "No cases yet"

**Symptoms**:
- Dashboard displays empty state
- Statistics show 0 cases
- Can't see previously submitted cases

**Solutions**:
1. Database may be corrupted
   ```bash
   # Backup and delete database
   mv backend/../healtheon.db backend/../healtheon.db.bak
   # Restart backend - new database created
   ```

2. API might not be returning cases
   ```bash
   curl http://localhost:8000/api/cases
   # Should return JSON with cases
   ```

3. Frontend might be cached
   - Clear browser cache
   - Force refresh (Ctrl+F5)
   - Check DevTools Network tab

4. Database query may be failing
   - Check backend logs
   - Verify SQLite file has read permissions

---

### Issue: Style/Layout looks broken

**Symptoms**:
- Colors wrong
- Layout jumps around
- Dark theme not working
- Buttons misaligned

**Solutions**:
1. Clear CSS cache
   ```bash
   # In browser DevTools
   Network → Disable cache
   Hard refresh (Ctrl+Shift+R)
   ```

2. Rebuild frontend
   ```bash
   cd frontend
   npm run build
   npm run dev
   ```

3. Check Tailwind CSS compilation
   ```bash
   # Verify tailwind.config.js exists
   cat frontend/tailwind.config.js
   ```

4. Verify CSS files loaded
   - DevTools → Application → check CSS
   - Should show style.css with content

5. Restart dev server
   ```bash
   # Kill frontend (Ctrl+C)
   cd frontend
   npm run dev
   ```

---

### Issue: Poll errors or inconsistent updates

**Symptoms**:
- Transcript updates sometimes miss messages
- Vitals jump around
- Status doesn't update immediately
- Polling seems to stop randomly

**Solutions**:
1. Check network tab
   - DevTools → Network
   - See if API calls are succeeding
   - Look for failed requests (red)

2. Verify polling interval correct
   - Dashboard: 5 second interval
   - Case Detail: 4 second interval
   - Should see requests every few seconds

3. Check browser console
   - F12 → Console
   - Look for JavaScript errors
   - Check Axios errors

4. Verify database transactions not blocking
   - Case might be locked
   - Try accessing from different page
   - Restart backend to release locks

5. Check system resources
   - Is CPU at 100%?
   - Is memory full?
   - Close other apps if struggling

---

### Issue: Can't access pages/routing broken

**Symptoms**:
- Page won't load when clicking links
- URL changes but content doesn't
- Blank page or 404 error
- Back button doesn't work

**Solutions**:
1. Check router configuration
   - Verify all routes in App.jsx
   - Check page imports are correct

2. Verify Vite config
   ```bash
   # Check base route
   cat frontend/vite.config.js
   ```

3. Clear browser history/cache
   - Ctrl+H (clear history)
   - Ctrl+Shift+Delete (clear cache)

4. Restart dev server
   ```bash
   npm run frontend
   ```

5. Check page file exists
   - Verify file in frontend/src/pages/
   - Check import path in App.jsx

---

## 🔧 Configuration Tips

### Environment Setup

**OpenAI Configuration**:
```bash
# backend/.env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-secret-key-here
OPENAI_MODEL=gpt-4o-mini
```

**Ollama Configuration**:
```bash
# backend/.env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3
```

### Performance Tuning

**Faster polling**:
```javascript
// In Case Detail
setInterval(fetchCase, 2000)  // Every 2 seconds (more frequent)
```

**Slower polling**:
```javascript
// For slower systems
setInterval(fetchCase, 8000)  // Every 8 seconds
```

**Reduce agent debate rounds**:
```python
# In backend orchestration
max_round=6  # Instead of 12 (faster completion)
```

### Security Hardening

**Require API key**:
```python
# In backend/config.py
REQUIRE_AUTH=True
API_KEY_REQUIRED=True
```

**CORS restrictions**:
```python
# In backend/main.py
CORS_ORIGINS = ["https://yourdomain.com"]  # Whitelist only
```

---

## 🚀 Optimization Checklist

- [ ] Monitor performance on slow networks (throttle in DevTools)
- [ ] Test on mobile viewport (375px, 768px, 1024px)
- [ ] Check bundle size: `npm run build` and check dist/
- [ ] Profile rendering performance (DevTools → Performance tab)
- [ ] Monitor memory leaks (DevTools → Memory tab)
- [ ] Check for console errors/warnings
- [ ] Verify all images optimized (use WebP format)
- [ ] Test error scenarios systematically

---

## 📞 Getting Help

### Debug Checklist
1. ✅ Check error message carefully
2. ✅ Look in browser console (F12)
3. ✅ Check backend logs (terminal)
4. ✅ Verify environment variables
5. ✅ Try refreshing page (F5)
6. ✅ Try restarting backend/frontend
7. ✅ Check network requests (DevTools Network tab)
8. ✅ Read documentation for that feature

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| "Cannot reach backend" | Backend not running | Start with `npm run backend` |
| "Chief complaint required" | Empty field on form | Fill in the field |
| "Failed to submit" | API error/timeout | Check backend logs |
| "Case not found" | Invalid case_id | Copy correct ID from URL |
| "Cannot connect to LLM" | API key invalid or offline | Verify .env configuration |

---

## 🎯 Best Practices

1. **Always start backend first**: `npm run backend` → then `npm run frontend`
2. **Use demo data for testing**: Quick way to test without waiting
3. **Monitor logs in separate terminal**: See real-time backend activity
4. **Keep DevTools open**: Catch errors immediately
5. **Use realistic test data**: Helps with AI agent evaluation
6. **Document any bugs**: Help improve the system
7. **Clear cache regularly**: Prevents stale UI state
8. **Test on different browsers**: Chrome, Firefox, Safari

---

## 📊 Performance Metrics to Monitor

- **Page Load Time**: Should be <2 seconds
- **First Paint**: <1 second
- **TTI (Time to Interactive)**: <3 seconds
- **Polling Latency**: <1 second per request
- **Database Query Time**: <100ms for case queries
- **Agent Response Time**: 5-30 seconds per message

---

## 🚨 Emergency Recovery

If everything breaks:

1. **Reset Database**:
   ```bash
   rm backend/../healtheon.db
   # Restart backend - new database created
   ```

2. **Clear All Caches**:
   ```bash
   rm -rf frontend/node_modules frontend/.vite
   npm install
   npm run dev
   ```

3. **Full System Restart**:
   ```bash
   # Kill all Node processes
   pkill -f node
   pkill -f python
   
   # Start fresh
   npm run dev
   ```

4. **Check System Health**:
   ```bash
   # Backend health check
   curl http://localhost:8000/health
   
   # Frontend accessibility
   open http://localhost:5173
   ```

---

**Last Updated**: 2024
**Version**: 2.0.4
**Status**: ✅ Complete Documentation
