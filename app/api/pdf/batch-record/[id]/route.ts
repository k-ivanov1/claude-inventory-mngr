import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import PDFDocument from 'pdfkit'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Initialize Supabase client
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get batch ID from URL params
    const batchId = params.id
    
    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID is required' },
        { status: 400 }
      )
    }
    
    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Fetch batch record with its related data
    const { data: batchRecord, error: batchError } = await supabase
      .from('batch_manufacturing_records')
      .select(`
        *,
        products:product_id(name),
        scales:scale_id(description, model)
      `)
      .eq('id', batchId)
      .single()
    
    if (batchError || !batchRecord) {
      console.error('Error fetching batch record:', batchError)
      return NextResponse.json(
        { error: 'Failed to fetch batch record' },
        { status: 500 }
      )
    }
    
    // Fetch batch ingredients
    const { data: ingredients, error: ingredientsError } = await supabase
      .from('batch_ingredients')
      .select(`
        *,
        raw_materials:raw_material_id(name, unit)
      `)
      .eq('batch_id', batchId)
    
    if (ingredientsError) {
      console.error('Error fetching batch ingredients:', ingredientsError)
      return NextResponse.json(
        { error: 'Failed to fetch batch ingredients' },
        { status: 500 }
      )
    }
    
    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 })
    
    // Set up the PDF response
    const chunks: Buffer[] = []
    let result: Buffer
    
    doc.on('data', (chunk) => {
      chunks.push(chunk)
    })
    
    doc.on('end', () => {
      result = Buffer.concat(chunks)
    })
    
    // Format batch record for PDF
    const productName = batchRecord.products?.name || 'Unknown Product'
    const scaleName = batchRecord.scales 
      ? `${batchRecord.scales.description}${batchRecord.scales.model ? ` (${batchRecord.scales.model})` : ''}`
      : 'Unknown Scale'
    
    // Format dates
    const formatDate = (dateString: string) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      return date.toLocaleDateString('en-GB')
    }
    
    const formatDateTime = (dateTimeString: string) => {
      if (!dateTimeString) return '-'
      const date = new Date(dateTimeString)
      return `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString('en-GB')}`
    }
    
    // Create the PDF
    // Header
    doc
      .fontSize(20)
      .text('Batch Manufacturing Record', { align: 'center' })
      .moveDown(0.5)
      
    // Batch Information Section
    doc
      .fontSize(16)
      .text('Batch Information')
      .moveDown(0.5)
      
    doc.fontSize(10)
    doc.text(`Batch ID: ${batchRecord.id}`)
    doc.text(`Date: ${formatDate(batchRecord.date)}`)
    doc.text(`Product: ${productName}`)
    doc.text(`Batch Size: ${batchRecord.batch_size} kg`)
    doc.text(`Start Time: ${formatDateTime(batchRecord.batch_started)}`)
    doc.text(`Finish Time: ${batchRecord.batch_finished ? formatDateTime(batchRecord.batch_finished) : 'In progress'}`)
    doc.moveDown()
    
    // Scale Verification Section
    doc
      .fontSize(16)
      .text('Scale Verification')
      .moveDown(0.5)
      
    doc.fontSize(10)
    doc.text(`Scale Equipment: ${scaleName}`)
    doc.text(`Target Weight: ${batchRecord.scale_target_weight} g`)
    doc.text(`Actual Reading: ${batchRecord.scale_actual_reading} g`)
    doc.moveDown()
    
    // Ingredients Section
    doc
      .fontSize(16)
      .text('Ingredients')
      .moveDown(0.5)
      
    if (ingredients && ingredients.length > 0) {
      // Create a table-like structure for ingredients
      const tableTop = doc.y
      doc.fontSize(9)
      
      // Draw table headers
      doc.font('Helvetica-Bold')
      doc.text('Raw Material', 50, tableTop)
      doc.text('Batch Number', 200, tableTop)
      doc.text('Best Before Date', 300, tableTop)
      doc.text('Quantity', 400, tableTop, { width: 100, align: 'right' })
      doc.moveDown(0.5)
      
      // Draw a line under the header
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
      doc.moveDown(0.5)
      
      // Reset font to normal
      doc.font('Helvetica')
      
      // Add ingredients rows
      ingredients.forEach((ingredient, index) => {
        const y = doc.y
        
        doc.text(ingredient.raw_materials?.name || 'Unknown material', 50)
        doc.text(ingredient.batch_number || '-', 200, y)
        doc.text(ingredient.best_before_date ? formatDate(ingredient.best_before_date) : '-', 300, y)
        
        const quantity = `${ingredient.quantity} ${ingredient.raw_materials?.unit || ''}`
        doc.text(quantity, 400, y, { width: 100, align: 'right' })
        
        doc.moveDown(0.5)
      })
    } else {
      doc.text('No ingredients found for this batch.')
    }
    doc.moveDown()
    
    // Compliance Checklist Section
    doc
      .fontSize(16)
      .text('Compliance Checklist')
      .moveDown(0.5)
      
    doc.fontSize(10)
    
    // Batch Completion Checklist
    doc.font('Helvetica-Bold').text('Batch Completion').font('Helvetica')
    doc.moveDown(0.5)
    
    doc.text(`Equipment clean after batch completion: ${batchRecord.equipment_clean ? 'Yes' : 'No'}`)
    doc.text(`Initials: ${batchRecord.equipment_clean_initials || '-'}`)
    doc.moveDown(0.5)
    
    doc.text(`Followed GMP (Good Manufacturing Practices): ${batchRecord.followed_gmp ? 'Yes' : 'No'}`)
    doc.text(`Initials: ${batchRecord.followed_gmp_initials || '-'}`)
    doc.moveDown(0.5)
    
    doc.text(`Best Before date matches product: ${batchRecord.bb_date_match ? 'Yes' : 'No'}`)
    doc.text(`Initials: ${batchRecord.bb_date_match_initials || '-'}`)
    doc.moveDown(0.5)
    
    doc.text(`Label meets all criteria and regulatory compliance: ${batchRecord.label_compliance ? 'Yes' : 'No'}`)
    doc.text(`Initials: ${batchRecord.label_compliance_initials || '-'}`)
    doc.moveDown()
    
    // Manager's Section
    doc
      .fontSize(16)
      .text(`Manager's Section`)
      .moveDown(0.5)
      
    doc.fontSize(10)
    doc.font('Helvetica-Bold').text(`Manager's Comments:`).font('Helvetica')
    doc.text(batchRecord.manager_comments || 'No comments provided.')
    doc.moveDown(0.5)
    
    doc.font('Helvetica-Bold').text('Remedial Actions:').font('Helvetica')
    doc.text(batchRecord.remedial_actions || 'No remedial actions required.')
    doc.moveDown(0.5)
    
    doc.font('Helvetica-Bold').text('Work Undertaken:').font('Helvetica')
    doc.text(batchRecord.work_undertaken || 'No work undertaken recorded.')
    
    // Footer with date and page number
    const pageCount = doc.bufferedPageRange().count
    for(let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)
      doc.fontSize(8)
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} - Page ${i + 1} of ${pageCount}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      )
    }
    
    // Finalize the PDF and end the stream
    doc.end()
    
    // Wait for the PDF to be generated
    await new Promise((resolve) => {
      doc.on('end', resolve)
    })
    
    // Return the PDF as a response
    return new NextResponse(result, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="batch-record-${batchId}.pdf"`,
      },
    })
    
  } catch (error: any) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
