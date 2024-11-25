const assert = require('assert');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');
const path = require('path');

describe('Performance Tests', () => {
    let dom;
    let document;
    let window;
    let perfMetrics;
    let baselineMetrics = {
        imageLoading: [],
        scrollHandling: [],
        memoryUsage: []
    };

    // Store baseline metrics in a file
    const BASELINE_FILE = path.join(__dirname, 'baseline_metrics.json');
    
    // Load previous baseline metrics if they exist
    function loadBaseline() {
        try {
            return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
        } catch (e) {
            return null;
        }
    }

    // Save new baseline metrics
    function saveBaseline(metrics) {
        fs.writeFileSync(BASELINE_FILE, JSON.stringify(metrics, null, 2));
    }

    // Compare current metrics with baseline
    function compareWithBaseline(testName, currentStats) {
        const baseline = loadBaseline();
        if (!baseline || !baseline[testName]) {
            console.log(`\nNo previous baseline for ${testName}. Establishing new baseline.`);
            return false;
        }

        const prev = baseline[testName];
        let regressions = [];

        if (currentStats.avg > prev.avg * 1.1) {
            regressions.push(`Average time increased by ${Math.round((currentStats.avg - prev.avg) / prev.avg * 100)}%`);
        }
        if (currentStats.p95 > prev.p95 * 1.1) {
            regressions.push(`P95 time increased by ${Math.round((currentStats.p95 - prev.p95) / prev.p95 * 100)}%`);
        }
        if (currentStats.max > prev.max * 1.2) {
            regressions.push(`Max time increased by ${Math.round((currentStats.max - prev.max) / prev.max * 100)}%`);
        }

        if (regressions.length > 0) {
            console.log('\n⚠️ Performance Regression Detected:');
            regressions.forEach(msg => console.log(`  - ${msg}`));
            console.log('\nPrevious Baseline:');
            console.log(`  Average: ${prev.avg}ms`);
            console.log(`  P95: ${prev.p95}ms`);
            console.log(`  Max: ${prev.max}ms`);
        } else {
            console.log('\n✅ Performance is within acceptable range of baseline');
        }

        return regressions.length === 0;
    }

    // Update baseline metrics
    function updateBaseline() {
        const currentMetrics = {
            'Image Loading': calculateStats(baselineMetrics.imageLoading),
            'Scroll Handling': calculateStats(baselineMetrics.scrollHandling)
        };

        const baseline = loadBaseline() || {};
        Object.assign(baseline, currentMetrics);
        saveBaseline(baseline);
    }

    // Store performance reports
    const REPORTS_DIR = path.join(__dirname, 'perf_reports');
    
    // Generate timestamp for report
    function getTimestamp() {
        const now = new Date();
        return now.toISOString().replace(/[:.]/g, '-');
    }

    // Save performance report
    function savePerformanceReport(metrics) {
        if (!fs.existsSync(REPORTS_DIR)) {
            fs.mkdirSync(REPORTS_DIR, { recursive: true });
        }

        const report = {
            timestamp: new Date().toISOString(),
            metrics,
            regressions: [],
            improvements: []
        };

        // Compare with baseline and record changes
        const baseline = loadBaseline();
        if (baseline) {
            Object.keys(metrics).forEach(testName => {
                const current = metrics[testName];
                const prev = baseline[testName];
                if (prev) {
                    const changes = {
                        avg: Math.round((current.avg - prev.avg) / prev.avg * 100),
                        p95: Math.round((current.p95 - prev.p95) / prev.p95 * 100),
                        max: Math.round((current.max - prev.max) / prev.max * 100)
                    };

                    Object.entries(changes).forEach(([metric, change]) => {
                        if (change > 10) {
                            report.regressions.push(`${testName} ${metric}: +${change}%`);
                        } else if (change < -10) {
                            report.improvements.push(`${testName} ${metric}: ${change}%`);
                        }
                    });
                }
            });
        }

        const reportPath = path.join(REPORTS_DIR, `perf_report_${getTimestamp()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Print summary
        console.log('\n📊 Performance Summary Report:');
        console.log('----------------------------');
        Object.entries(metrics).forEach(([testName, stats]) => {
            console.log(`\n${testName}:`);
            console.log(`  Average: ${stats.avg}ms`);
            console.log(`  P95: ${stats.p95}ms`);
            console.log(`  Range: ${stats.min}ms - ${stats.max}ms`);
        });

        if (report.improvements.length > 0) {
            console.log('\n🎉 Improvements:');
            report.improvements.forEach(imp => console.log(`  ✓ ${imp}`));
        }

        if (report.regressions.length > 0) {
            console.log('\n⚠️ Regressions:');
            report.regressions.forEach(reg => console.log(`  ! ${reg}`));
        }

        console.log(`\n📝 Full report saved to: ${reportPath}`);
    }

    after(() => {
        const currentMetrics = {
            'Image Loading': calculateStats(baselineMetrics.imageLoading),
            'Scroll Handling': calculateStats(baselineMetrics.scrollHandling)
        };

        // Update baseline
        const baseline = loadBaseline() || {};
        Object.assign(baseline, currentMetrics);
        saveBaseline(baseline);

        // Generate and save report
        savePerformanceReport(currentMetrics);
    });

    // Helper function to calculate statistics
    function calculateStats(measurements) {
        const sum = measurements.reduce((a, b) => a + b, 0);
        const avg = sum / measurements.length;
        const sorted = [...measurements].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        
        return {
            avg: Math.round(avg * 100) / 100,
            median: Math.round(median * 100) / 100,
            min: Math.round(min * 100) / 100,
            max: Math.round(max * 100) / 100,
            p95: Math.round(p95 * 100) / 100
        };
    }

    // Helper function to print performance report
    function printPerformanceReport(testName, measurements) {
        const stats = calculateStats(measurements);
        console.log(`\n${testName} Performance Report:`);
        console.log(`  Average: ${stats.avg}ms`);
        console.log(`  Median: ${stats.median}ms`);
        console.log(`  Min: ${stats.min}ms`);
        console.log(`  Max: ${stats.max}ms`);
        console.log(`  P95: ${stats.p95}ms`);
        
        compareWithBaseline(testName, stats);
        return stats;
    }

    beforeEach(() => {
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
                <body>
                    <div id="imageGrid"></div>
                </body>
            </html>
        `, {
            url: 'http://localhost',
            runScripts: 'dangerously',
            resources: 'usable',
            pretendToBeVisual: true
        });

        document = dom.window.document;
        window = dom.window;

        // Mock performance API
        window.performance = {
            now: () => Date.now(),
            memory: {
                usedJSHeapSize: 0,
                totalJSHeapSize: 0
            }
        };

        perfMetrics = {
            fetchTime: 0,
            renderTime: 0,
            imageLoadTime: 0,
            memoryUsage: 0
        };
    });

    it('should establish baseline for image loading', async () => {
        const NUM_RUNS = 5;
        for (let run = 0; run < NUM_RUNS; run++) {
            const startTime = window.performance.now();
            
            // Create 100 test images
            const images = Array.from({ length: 100 }, (_, i) => ({
                url: `test-image-${i}.jpg`,
                name: `Test Image ${i}`
            }));

            // Test chunk loading
            const CHUNK_SIZE = 20;
            for (let i = 0; i < images.length; i += CHUNK_SIZE) {
                const chunk = images.slice(i, i + CHUNK_SIZE);
                const fragment = document.createDocumentFragment();
                chunk.forEach(image => {
                    const div = document.createElement('div');
                    div.className = 'image-container';
                    const img = document.createElement('img');
                    img.src = image.url;
                    img.alt = image.name;
                    div.appendChild(img);
                    fragment.appendChild(div);
                });
                document.getElementById('imageGrid').appendChild(fragment);
            }

            const totalTime = window.performance.now() - startTime;
            baselineMetrics.imageLoading.push(totalTime);
            document.getElementById('imageGrid').innerHTML = ''; // Clear for next run
        }

        const stats = printPerformanceReport('Image Loading', baselineMetrics.imageLoading);
        assert.ok(stats.avg < 50, 'Average image loading time should be under 50ms');
        assert.ok(stats.p95 < 100, '95th percentile should be under 100ms');
    });

    it('should establish baseline for scroll handling', () => {
        const NUM_RUNS = 5;
        for (let run = 0; run < NUM_RUNS; run++) {
            const startTime = window.performance.now();
            
            // Simulate 100 rapid scroll events
            for (let i = 0; i < 100; i++) {
                window.dispatchEvent(new dom.window.Event('scroll'));
            }
            
            const totalTime = window.performance.now() - startTime;
            baselineMetrics.scrollHandling.push(totalTime);
        }

        const stats = printPerformanceReport('Scroll Handling', baselineMetrics.scrollHandling);
        assert.ok(stats.avg < 5, 'Average scroll handling time should be under 5ms');
        assert.ok(stats.p95 < 10, '95th percentile should be under 10ms');
    });

    it('should load images in chunks efficiently', async () => {
        const startTime = window.performance.now();
        
        // Create 100 test images
        const images = Array.from({ length: 100 }, (_, i) => ({
            url: `test-image-${i}.jpg`,
            name: `Test Image ${i}`
        }));

        // Test chunk loading
        const CHUNK_SIZE = 20;
        let totalChunkTime = 0;
        const chunkTimes = [];
        for (let i = 0; i < images.length; i += CHUNK_SIZE) {
            const chunk = images.slice(i, i + CHUNK_SIZE);
            const chunkStartTime = window.performance.now();
            
            // Create and append images
            const fragment = document.createDocumentFragment();
            chunk.forEach(image => {
                const div = document.createElement('div');
                div.className = 'image-container';
                const img = document.createElement('img');
                img.src = image.url;
                img.alt = image.name;
                div.appendChild(img);
                fragment.appendChild(div);
            });
            
            document.getElementById('imageGrid').appendChild(fragment);
            
            const chunkTime = window.performance.now() - chunkStartTime;
            chunkTimes.push(chunkTime);
            totalChunkTime += chunkTime;
            console.log(`Chunk ${i/CHUNK_SIZE + 1} loaded in ${Math.round(chunkTime)}ms`);
            assert.ok(chunkTime < 100, `Chunk ${i/CHUNK_SIZE + 1} loaded in ${chunkTime}ms (should be < 100ms)`);
        }

        const totalTime = window.performance.now() - startTime;
        const chunkStats = calculateStats(chunkTimes);
        console.log('\nChunk Loading Performance:');
        console.log(`  Average chunk time: ${chunkStats.avg}ms`);
        console.log(`  P95 chunk time: ${chunkStats.p95}ms`);
        console.log(`  Max chunk time: ${chunkStats.max}ms`);
        console.log(`\nTotal loading time: ${Math.round(totalTime)}ms`);
        
        assert.ok(chunkStats.avg < 20, 'Average chunk loading time should be under 20ms');
        assert.ok(totalTime < 1000, `Total loading time ${totalTime}ms should be < 1000ms`);
    });

    it('should handle scroll events efficiently', () => {
        let scrollCount = 0;
        const startTime = window.performance.now();
        const measurements = [];
        
        // Simulate 100 rapid scroll events
        for (let i = 0; i < 100; i++) {
            const eventStartTime = window.performance.now();
            window.dispatchEvent(new dom.window.Event('scroll'));
            const eventTime = window.performance.now() - eventStartTime;
            measurements.push(eventTime);
            scrollCount++;
        }
        
        const totalTime = window.performance.now() - startTime;
        const eventStats = calculateStats(measurements);
        console.log('\nScroll Event Performance:');
        console.log(`  Average event time: ${eventStats.avg}ms`);
        console.log(`  P95 event time: ${eventStats.p95}ms`);
        console.log(`  Total time: ${Math.round(totalTime)}ms`);
        
        assert.ok(eventStats.avg < 1, 'Average event time should be under 1ms');
        assert.ok(totalTime < 500, `Total handling time ${totalTime}ms should be < 500ms`);
    });
});
