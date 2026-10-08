"""
Plugin de pytest para mejorar el reporte HTML de casos de prueba
Genera un reporte visual con dashboard, gráficos y mejor formato
"""
import pytest
from datetime import datetime
from py.xml import html
import os


def pytest_configure(config):
    """Configura el CSS personalizado"""
    css_path = os.path.join(os.path.dirname(__file__), "assets", "report_style.css")
    if os.path.exists(css_path):
        # Agrega el CSS al reporte
        config._metadata = getattr(config, '_metadata', {})


def pytest_html_report_title(report):
    """Personaliza el título del reporte"""
    report.title = "🧪 Reporte de Tests - Casos de Prueba"


def pytest_html_results_summary(prefix, summary, postfix):
    """Agrega resumen personalizado al inicio del reporte"""
    prefix.extend([
        html.div(
            html.h1("🧪 Reporte de Tests - Casos de Prueba", style="margin: 0; font-size: 32px;"),
            html.p(f"⏰ {datetime.now().strftime('%d de %B de %Y - %H:%M:%S')}", 
                   style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;"),
            style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); "
                  "padding: 40px; border-radius: 15px; color: white; margin-bottom: 40px; "
                  "box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);"
        )
    ])
    
    # Agregar script JavaScript para estadísticas dinámicas
    postfix.extend([
        html.raw("""
        <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Calcular estadísticas por categoría
            const rows = document.querySelectorAll('tbody tr');
            const categoryStats = {};
            
            rows.forEach(row => {
                const category = row.cells[0].textContent.trim();
                const result = row.classList.contains('passed') ? 'passed' : 
                              row.classList.contains('failed') ? 'failed' : 'skipped';
                
                if (!categoryStats[category]) {
                    categoryStats[category] = { passed: 0, failed: 0, skipped: 0, total: 0 };
                }
                categoryStats[category][result]++;
                categoryStats[category].total++;
            });
            
            // Crear dashboard de categorías
            const summary = document.querySelector('.summary');
            if (summary) {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'category-stats';
                categoryDiv.innerHTML = '<h2>📊 Estadísticas por Categoría</h2>';
                
                Object.keys(categoryStats).sort().forEach(category => {
                    const stats = categoryStats[category];
                    const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
                    
                    const item = document.createElement('div');
                    item.className = 'category-item';
                    item.innerHTML = `
                        <div class="name">${category}</div>
                        <div class="stats">
                            <div class="stat passed">✅ ${stats.passed}</div>
                            <div class="stat failed">❌ ${stats.failed}</div>
                            <div class="stat">${passRate}%</div>
                        </div>
                    `;
                    categoryDiv.appendChild(item);
                });
                
                summary.parentNode.insertBefore(categoryDiv, summary.nextSibling);
            }
        });
        </script>
        """)
    ])


def pytest_html_results_table_header(cells):
    """Personaliza las columnas de la tabla de resultados"""
    cells.insert(0, html.th("Categoría", class_="sortable", style="background: #2196F3; color: white;"))
    cells.insert(1, html.th("Caso de Prueba", class_="sortable", style="background: #2196F3; color: white;"))
    cells.pop()  # Remover columna Links si existe


def pytest_html_results_table_row(report, cells):
    """Personaliza cada fila de la tabla"""
    # Extraer categoría del nombre del test
    test_name = report.nodeid
    category = "N/A"
    test_case = test_name.split("::")[-1] if "::" in test_name else test_name
    
    # Extraer categoría (CP01, CP02, etc.)
    if "CP01" in test_name or "RegistroUsuarios" in test_name:
        category = "CP01: Registro"
    elif "CP02" in test_name or "Autenticacion" in test_name:
        category = "CP02: Autenticación"
    elif "CP03" in test_name or "GestionEventos" in test_name:
        category = "CP03: Eventos"
    elif "CP04" in test_name or "GestionTicketsTarifas" in test_name:
        category = "CP04: Tickets/Tarifas"
    elif "CP05" in test_name or "ProcesoCompra" in test_name:
        category = "CP05: Compras"
    elif "CP06" in test_name or "ValidacionTickets" in test_name:
        category = "CP06: Validación"
    elif "CP07" in test_name or "ReportesConsultas" in test_name:
        category = "CP07: Reportes"
    elif "CP08" in test_name or "CasosIntegracion" in test_name:
        category = "CP08: Integración"
    
    # Insertar categoría y nombre limpio
    cells.insert(0, html.td(category, style="font-weight: bold; color: #2196F3;"))
    cells.insert(1, html.td(test_case, style="font-family: monospace;"))
    cells.pop()  # Remover columna Links


def pytest_configure(config):
    """Configura metadatos del reporte"""
    config._metadata = {
        'Proyecto': 'Sistema de Tickets PUCP',
        'Módulo': 'Casos de Prueba - Backend',
        'Entorno': 'Test',
        'Python': config.getoption('--version') if hasattr(config, 'getoption') else 'N/A'
    }


def pytest_html_results_table_html(report, data):
    """Agrega estilos CSS personalizados"""
    if report.passed:
        del data[:]
        data.append(html.div(
            "✅ PASÓ",
            style="background: #4CAF50; color: white; padding: 5px 10px; "
                  "border-radius: 5px; text-align: center; font-weight: bold;"
        ))
    elif report.failed:
        del data[:]
        data.append(html.div(
            "❌ FALLÓ",
            style="background: #f44336; color: white; padding: 5px 10px; "
                  "border-radius: 5px; text-align: center; font-weight: bold;"
        ))
    elif report.skipped:
        del data[:]
        data.append(html.div(
            "⏭️ OMITIDO",
            style="background: #FF9800; color: white; padding: 5px 10px; "
                  "border-radius: 5px; text-align: center; font-weight: bold;"
        ))
